/**
 * Whitelist Test
 */

import { AccountUpdate, Field, Mina, PrivateKey, PublicKey } from 'o1js';
import { Whitelist } from './Whitelist';

let proofsEnabled = false;

describe('Whitelist', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    userAccount: PublicKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Whitelist;

  beforeAll(async () => {
    if (proofsEnabled) await Whitelist.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ publicKey: userAccount } = Local.testAccounts[2]);

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Whitelist(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy({
        owner: deployerAccount,
      });
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
    // For initializer
    /*     const initializerTx = await Mina.transaction(deployerAccount, () => {
      zkApp.initializer();
    });
    await initializerTx.prove();
    await initializerTx.sign([deployerKey]).send(); */
  }

  it('should deploy "Whitelist" smart contract', async () => {
    await localDeploy();
    const ownerAddress = zkApp.owner.get();
    expect(ownerAddress).toEqual(deployerAccount);
    const initializerTx = await Mina.transaction(deployerAccount, () => {
      zkApp.initializer();
    });
    await initializerTx.prove();
    await initializerTx.sign([deployerKey]).send();
    const whitelistRoot = zkApp.whitelistRoot.get();
    Field(0).assertEquals(whitelistRoot);
    // TODO: If we run initializer function, we take the error "renounceOwnership" function
    // But if we don't run initializer function, "renounceOwnership" function is working
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.renounceOwnership();
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();
  });

  it('should run "renounceOwnership" function', async () => {
    await localDeploy();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.renounceOwnership();
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();
    const ownerAddress = zkApp.owner.get();
    expect(ownerAddress).toEqual(PublicKey.empty());
  });
});
