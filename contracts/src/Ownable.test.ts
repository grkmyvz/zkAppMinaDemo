import { AccountUpdate, Mina, PrivateKey, PublicKey } from 'o1js';
import { Ownable } from './Ownable';

/**
 * Ownable Test
 */

let proofsEnabled = false;

describe('Ownable', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    userAccount: PublicKey,
    userKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Ownable;

  beforeAll(async () => {
    if (proofsEnabled) await Ownable.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: userKey, publicKey: userAccount } = Local.testAccounts[2]);

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Ownable(zkAppAddress);
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
  }

  async function localTransferOwnership() {
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.transferOwnership(userAccount);
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();
  }

  async function localAcceptOwnership() {
    const txn = await Mina.transaction(userAccount, () => {
      zkApp.acceptOwnership();
    });
    await txn.prove();
    await txn.sign([userKey]).send();
  }

  it('should deploy "Ownable" smart contract', async () => {
    await localDeploy();
    const ownerAddress = zkApp.owner.get();
    expect(ownerAddress).toEqual(deployerAccount);
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

  it('should run "transferOwnership" function', async () => {
    await localDeploy();
    await localTransferOwnership();
    const pendingOwner = zkApp.pendingOwner.get();
    expect(pendingOwner).toEqual(userAccount);
  });

  it('should run "acceptOwnership" function', async () => {
    await localDeploy();
    await localTransferOwnership();
    await localAcceptOwnership();
    const ownerAddress = zkApp.owner.get();
    expect(ownerAddress).toEqual(userAccount);
  });

  it('should run "cancelOwnershipTransfer" function', async () => {
    await localDeploy();
    await localTransferOwnership();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.cancelOwnershipTransfer();
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();
    const pendingOwner = zkApp.pendingOwner.get();
    expect(pendingOwner).toEqual(PublicKey.empty());
  });
});
