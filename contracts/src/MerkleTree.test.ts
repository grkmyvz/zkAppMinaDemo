/**
 * MerkleTree Test
 */

import {
  AccountUpdate,
  Mina,
  PrivateKey,
  PublicKey,
  MerkleTree,
  UInt32,
  Field,
} from 'o1js';
import { Account, MerkleTreePoint, MyMerkleWitness } from './MerkleTree';

let proofsEnabled = false;
export let initialMerkleProof: Field = Field(0);

type Names = 'Alice' | 'Bob' | 'Charlie';
let accounts: Map<string, Account> = new Map<Names, Account>(
  ['Alice', 'Bob', 'Charlie'].map((name: string) => {
    return [
      name as Names,
      new Account({
        publicKey: PrivateKey.random().toPublicKey(),
        points: UInt32.from(0),
      }),
    ];
  })
);

let Tree = new MerkleTree(8);
let alice = accounts.get('Alice')!;
let bob = accounts.get('Bob')!;

Tree.setLeaf(0n, alice.hash());
Tree.setLeaf(1n, bob.hash());

initialMerkleProof = Tree.getRoot();

describe('MoneyTransfer', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    userAccount: PublicKey,
    userKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: MerkleTreePoint;

  beforeAll(async () => {
    if (proofsEnabled) await MerkleTreePoint.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: userKey, publicKey: userAccount } = Local.testAccounts[2]);

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new MerkleTreePoint(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy({});
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  async function increasePointForzKApp(index: bigint, account: Account) {
    let w = Tree.getWitness(index);
    let witness = new MyMerkleWitness(w);

    let txn = await Mina.transaction(deployerAccount, () => {
      zkApp.increasePoint(account, witness);
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();

    account.points = account.points.add(1);
    Tree.setLeaf(index, account.hash());
    zkApp.merkleRoot.getAndRequireEquals().assertEquals(Tree.getRoot());
  }

  it('should deploy', async () => {
    await localDeploy();
  });

  it('should increase point', async () => {
    await localDeploy();

    expect(alice.points).toEqual(UInt32.from(0));

    await increasePointForzKApp(0n, alice);

    expect(alice.points).toEqual(UInt32.from(1));
  });

  it('should add account', async () => {
    await localDeploy();

    let w = Tree.getWitness(2n);
    let witness = new MyMerkleWitness(w);
    let txn = await Mina.transaction(deployerAccount, () => {
      zkApp.addAccount(bob, witness);
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();

    Tree.setLeaf(2n, bob.hash());
    zkApp.merkleRoot.getAndRequireEquals().assertEquals(Tree.getRoot());

    expect(Tree.getRoot()).toEqual(zkApp.merkleRoot.getAndRequireEquals());

    await increasePointForzKApp(2n, bob);

    expect(bob.points).toEqual(UInt32.from(1));
    expect(Tree.getRoot()).toEqual(zkApp.merkleRoot.getAndRequireEquals());
  });
});
