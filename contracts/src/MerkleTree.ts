import {
  SmartContract,
  MerkleWitness,
  Struct,
  PublicKey,
  UInt32,
  Field,
  Poseidon,
  state,
  State,
  method,
} from 'o1js';
import { initialMerkleProof } from './MerkleTree.test';

export class MyMerkleWitness extends MerkleWitness(8) {}

export class Account extends Struct({
  publicKey: PublicKey,
  points: UInt32,
}) {
  hash(): Field {
    return Poseidon.hash(Account.toFields(this));
  }

  addPoint(point: number) {
    return new Account({
      publicKey: this.publicKey,
      points: this.points.add(point),
    });
  }
}

export class MerkleTreePoint extends SmartContract {
  @state(Field) merkleRoot = State<Field>();

  @method init() {
    super.init();
    this.merkleRoot.set(initialMerkleProof);
  }

  @method addAccount(account: Account, path: MyMerkleWitness) {
    let merkleRoot = this.merkleRoot.getAndRequireEquals();

    path.calculateRoot(Field(0)).assertEquals(merkleRoot);

    let newMerkleRoot = path.calculateRoot(account.hash());

    this.merkleRoot.set(newMerkleRoot);
  }

  @method increasePoint(account: Account, path: MyMerkleWitness) {
    let merkleRoot = this.merkleRoot.getAndRequireEquals();

    path.calculateRoot(account.hash()).assertEquals(merkleRoot);

    let newAccount = account.addPoint(1);

    let newMerkleRoot = path.calculateRoot(newAccount.hash());

    this.merkleRoot.set(newMerkleRoot);
  }
}
