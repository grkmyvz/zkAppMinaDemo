import {
  AccountUpdate,
  Field,
  MerkleWitness,
  Poseidon,
  PublicKey,
  SmartContract,
  State,
  Struct,
  UInt32,
  method,
  state,
  UInt64,
  Provable,
  Bool,
} from 'o1js';

export class ZkAnvilMerkleWitness extends MerkleWitness(8) {}

export class Item extends Struct({
  id: UInt32,
  upgrade: UInt32,
}) {}

export class User extends Struct({
  publicKey: PublicKey,
  items: Provable.Array(Item, 6),
}) {
  hash(): Field {
    return Poseidon.hash(User.toFields(this));
  }

  slotCheck(index: UInt32): Bool {
    let check: Bool;
    let id = Provable.witness(UInt32, () => {
      return this.items[Number(index.value)].id;
    });
    check = id.equals(UInt32.from(0));

    return check;
  }

  updateItem(slotIndex: UInt32, item: Item): User {
    let newItems = Provable.witness(Provable.Array(Item, 6), () => {
      let newItems = this.items;
      newItems[Number(slotIndex.value)] = item;
      return newItems;
    });

    return new User({
      publicKey: this.publicKey,
      items: newItems,
    });
  }
}

export class zkAnvil extends SmartContract {
  @state(PublicKey) admin = State<PublicKey>();
  @state(Field) merkleRoot = State<Field>();

  events = {
    addUser: PublicKey,
    buyItem: PublicKey,
  };

  @method init() {
    super.init();
    AccountUpdate.createSigned(this.sender);
    this.admin.set(this.sender);
    this.merkleRoot.set(Field(0));
  }

  @method getTimestamp(): UInt64 {
    return this.network.timestamp.getAndRequireEquals();
  }

  @method addUser(user: User, path: ZkAnvilMerkleWitness) {
    AccountUpdate.createSigned(this.sender);
    this.sender.assertEquals(this.admin.getAndRequireEquals());

    let newMerkleRoot = path.calculateRoot(user.hash());

    this.merkleRoot.set(newMerkleRoot);
  }

  @method buyItem(
    user: User,
    slotIndex: UInt32,
    item: Item,
    path: ZkAnvilMerkleWitness
  ) {
    AccountUpdate.createSigned(this.sender);
    this.sender.assertEquals(user.publicKey);

    let slotCheck = user.slotCheck(slotIndex);
    slotCheck.assertTrue();

    let merkleRoot = this.merkleRoot.getAndRequireEquals();
    path.calculateRoot(user.hash()).assertEquals(merkleRoot);

    let payerUpdate = AccountUpdate.createSigned(this.sender);
    payerUpdate.send({ to: this.address, amount: UInt64.from(5) });

    let newUserData = user.updateItem(slotIndex, item);

    let newMerkleRoot = path.calculateRoot(newUserData.hash());

    this.merkleRoot.set(newMerkleRoot);
  }

  @method upgradeItem(
    user: User,
    slotIndex: UInt32,
    item: Item,
    path: ZkAnvilMerkleWitness
  ): Bool {
    AccountUpdate.createSigned(this.sender);
    this.sender.assertEquals(user.publicKey);

    let merkleRoot = this.merkleRoot.getAndRequireEquals();
    path.calculateRoot(user.hash()).assertEquals(merkleRoot);

    let payerUpdate = AccountUpdate.createSigned(this.sender);
    payerUpdate.send({ to: this.address, amount: UInt64.from(5) });

    let ts = this.getTimestamp();
    let isSuccess = Bool.or(
      ts.mod(UInt64.from(10)).equals(UInt64.from(0)),
      Bool.or(
        ts.mod(UInt64.from(10)).equals(UInt64.from(3)),
        Bool.or(
          ts.mod(UInt64.from(10)).equals(UInt64.from(5)),
          ts.mod(UInt64.from(10)).equals(UInt64.from(7))
        )
      )
    );
    Provable.log('Timestamp', ts, 'isSuccess', isSuccess);

    let id = Provable.if(isSuccess, item.id, UInt32.from(0));
    let upgraded = Provable.if(
      isSuccess,
      item.upgrade.add(UInt32.from(1)),
      UInt32.from(0)
    );

    let newItemData = new Item({
      id: id,
      upgrade: upgraded,
    });

    let newUserData = user.updateItem(slotIndex, newItemData);

    let newMerkleRoot = path.calculateRoot(newUserData.hash());

    this.merkleRoot.set(newMerkleRoot);

    return isSuccess;
  }

  @method withdraw(amount: UInt64) {
    AccountUpdate.createSigned(this.sender);
    this.sender.assertEquals(this.admin.getAndRequireEquals());

    this.send({ to: this.sender, amount });
  }
}
