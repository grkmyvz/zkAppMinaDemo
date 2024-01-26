import {
  method,
  AccountUpdate,
  SmartContract,
  UInt64,
  Permissions,
} from 'o1js';

export class MoneyTransfer extends SmartContract {
  events = {
    deposit: UInt64,
    withdraw: UInt64,
  };

  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proofOrSignature(),
    });
  }

  /**
   * This method is depositing money to the contract.
   * It emits a `deposit` event.
   */
  @method deposit(amount: UInt64) {
    const payerUpdate = AccountUpdate.createSigned(this.sender);
    payerUpdate.send({ to: this.address, amount });

    this.emitEvent('deposit', amount);
  }

  /**
   * This method is withdrawing money from the contract.
   * It emits a `withdraw` event.
   */
  @method withdraw(amount: UInt64) {
    this.send({ to: this.sender, amount });

    this.emitEvent('withdraw', amount);
  }
}
