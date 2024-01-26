/**
 * MoneyTransfer Test
 */

import { AccountUpdate, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
import { MoneyTransfer } from './MoneyTransfer';

const defaultBalance = UInt64.from(1000000000000);
let proofsEnabled = false;

describe('MoneyTransfer', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    userAccount: PublicKey,
    userKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: MoneyTransfer;

  beforeAll(async () => {
    if (proofsEnabled) await MoneyTransfer.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: userKey, publicKey: userAccount } = Local.testAccounts[2]);

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new MoneyTransfer(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy({});
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('should deploy', async () => {
    await localDeploy();
  });

  it('should deposit 1 mina', async () => {
    await localDeploy();

    expect(Mina.getBalance(userAccount)).toEqual(defaultBalance);
    expect(Mina.getBalance(zkAppAddress)).toEqual(UInt64.from(0));

    const txn = await Mina.transaction(userAccount, () => {
      zkApp.deposit(UInt64.from(1));
    });
    await txn.prove();
    await txn.sign([userKey]).send();

    expect(Mina.getBalance(userAccount)).toEqual(defaultBalance.sub(1));
    expect(Mina.getBalance(zkAppAddress)).toEqual(UInt64.from(1));
  });

  it('should withdraw 2 mina', async () => {
    await localDeploy();

    const depositTxn = await Mina.transaction(deployerAccount, () => {
      zkApp.deposit(UInt64.from(10));
    });
    await depositTxn.prove();
    await depositTxn.sign([deployerKey]).send();

    expect(Mina.getBalance(zkAppAddress)).toEqual(UInt64.from(10));

    const withdrawTxn = await Mina.transaction(userAccount, () => {
      zkApp.withdraw(UInt64.from(2));
    });
    await withdrawTxn.prove();
    await withdrawTxn.sign([userKey]).send();

    expect(Mina.getBalance(zkAppAddress)).toEqual(UInt64.from(8));
    expect(Mina.getBalance(userAccount)).toEqual(defaultBalance.add(2));
  });
});
