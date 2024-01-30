/**
 * zkAnvil Test
 */

import {
  AccountUpdate,
  Bool,
  Field,
  MerkleTree,
  Mina,
  PrivateKey,
  PublicKey,
  UInt32,
} from 'o1js';
import { Item, User, ZkAnvilMerkleWitness, zkAnvil } from './zkAnvil';
import { itemList } from './items';

let proofsEnabled = false;

describe('zkAnvil', () => {
  let adminAccount: PublicKey,
    adminKey: PrivateKey,
    user1Account: PublicKey,
    user1Key: PrivateKey,
    user2Account: PublicKey,
    user2Key: PrivateKey,
    zkAppAddress: PublicKey,
    zkAnvilAppPrivateKey: PrivateKey,
    zkAnvilApp: zkAnvil;

  let users: Map<string, User>;

  let admin: User;
  let user1: User;
  let user2: User;

  let tree: MerkleTree;

  async function localDeploy() {
    const txn = await Mina.transaction(adminAccount, () => {
      AccountUpdate.fundNewAccount(adminAccount);
      zkAnvilApp.deploy({});
    });
    await txn.prove();
    await txn.sign([adminKey, zkAnvilAppPrivateKey]).send();
  }

  async function localAddUser(witnessIndex: bigint, user: User) {
    let w = tree.getWitness(witnessIndex);
    let witness = new ZkAnvilMerkleWitness(w);

    let addUserTxn = await Mina.transaction(adminAccount, () => {
      zkAnvilApp.addUser(user, witness);
    });
    await addUserTxn.prove();
    await addUserTxn.sign([adminKey]).send();

    tree.setLeaf(witnessIndex, user.hash());
    zkAnvilApp.merkleRoot.getAndRequireEquals().assertEquals(tree.getRoot());

    expect(tree.getRoot()).toEqual(zkAnvilApp.merkleRoot.getAndRequireEquals());
  }

  async function localBuyItem(
    witnessIndex: bigint,
    user: User,
    slotIndex: UInt32,
    itemId: number,
    userAccount: PublicKey,
    userKey: PrivateKey
  ) {
    let w = tree.getWitness(witnessIndex);
    let witness = new ZkAnvilMerkleWitness(w);

    const item = itemList[itemId];

    let buyItemTxn = await Mina.transaction(userAccount, () => {
      zkAnvilApp.buyItem(user, slotIndex, item, witness);
    });
    await buyItemTxn.prove();
    await buyItemTxn.sign([userKey]).send();

    user = user.updateItem(slotIndex, item);
    tree.setLeaf(witnessIndex, user.hash());

    expect(zkAnvilApp.merkleRoot.getAndRequireEquals()).toEqual(tree.getRoot());
  }

  async function localUpgradeItem(
    witnessIndex: bigint,
    user: User,
    slotIndex: UInt32,
    userAccount: PublicKey,
    userKey: PrivateKey
  ) {
    let w = tree.getWitness(witnessIndex);
    let witness = new ZkAnvilMerkleWitness(w);

    let item = user.items[Number(slotIndex.value)];

    let upgradeNumber = item.upgrade.add(UInt32.from(1));
    let upgradedItem = new Item({
      id: item.id,
      upgrade: upgradeNumber,
    });

    let upgradeItemTxn = await Mina.transaction(userAccount, () => {
      zkAnvilApp.upgradeItem(user, UInt32.from(0), item, witness);
    });
    await upgradeItemTxn.prove();
    let result = await upgradeItemTxn.sign([userKey]).send();

    console.log(result);

    user = user.updateItem(UInt32.from(0), upgradedItem);
    tree.setLeaf(witnessIndex, user.hash());

    expect(zkAnvilApp.merkleRoot.getAndRequireEquals()).toEqual(tree.getRoot());
  }

  beforeAll(async () => {
    if (proofsEnabled) await zkAnvil.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });

    users = new Map<string, User>(
      ['Admin', 'User1', 'User2'].map((name: string) => {
        return [
          name,
          new User({
            publicKey: PrivateKey.random().toPublicKey(),
            items: Array.from({ length: 6 }, () => {
              return new Item({
                id: UInt32.from(0),
                upgrade: UInt32.from(0),
              });
            }),
          }),
        ];
      })
    );

    admin = users.get('Admin')!;
    user1 = users.get('User1')!;
    user2 = users.get('User2')!;

    tree = new MerkleTree(8);

    Mina.setActiveInstance(Local);
    ({ privateKey: adminKey, publicKey: adminAccount } = Local.testAccounts[0]);
    ({ privateKey: user1Key, publicKey: user1Account } = Local.testAccounts[1]);
    ({ privateKey: user2Key, publicKey: user2Account } = Local.testAccounts[2]);

    users.get('Admin')!.publicKey = adminAccount;
    users.get('User1')!.publicKey = user1Account;
    users.get('User2')!.publicKey = user2Account;

    zkAnvilAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAnvilAppPrivateKey.toPublicKey();
    zkAnvilApp = new zkAnvil(zkAppAddress);
  });

  it('should deploy', async () => {
    await localDeploy();

    expect(zkAnvilApp.admin.get()).toEqual(adminAccount);
    expect(zkAnvilApp.merkleRoot.get()).toEqual(Field(0));
  });

  it('should add user', async () => {
    await localDeploy();

    await localAddUser(0n, user1);
  });

  it('should buy item', async () => {
    await localDeploy();

    await localAddUser(0n, user1);

    await localBuyItem(0n, user1, UInt32.from(0), 1001, user1Account, user1Key);
    await localBuyItem(0n, user1, UInt32.from(1), 2001, user1Account, user1Key);
    // For error.
    //await localBuyItem(0n, user1, UInt32.from(1), 3001, user1Account, user1Key);
  });

  it('should buy item and upgrade', async () => {
    await localDeploy();

    await localAddUser(0n, user1);

    await localBuyItem(0n, user1, UInt32.from(0), 1001, user1Account, user1Key);
    console.log('before', JSON.stringify(user1));
    await localUpgradeItem(0n, user1, UInt32.from(0), user1Account, user1Key);
    console.log('after', JSON.stringify(user1));
    console.log(JSON.stringify(zkAnvilApp.getTimestamp()));
  });
});
