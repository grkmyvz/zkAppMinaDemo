import {
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  Bool,
  AccountUpdate,
  DeployArgs,
} from 'o1js';

/**
 * Ownable Contract
 */

interface CustomDeployArgs {
  owner: PublicKey;
}

export class Ownable extends SmartContract {
  @state(PublicKey) owner = State<PublicKey>(); // Owner Address
  @state(PublicKey) pendingOwner = State<PublicKey>(); // Pending Owner Address
  @state(Bool) ownerTransferInitializer = State<Bool>();

  events = {
    'renounce-ownership': PublicKey, // Return owner address
    'transfer-ownership': PublicKey, // Return pending owner address
    'accept-ownership': PublicKey, // Return new owner address
    'cancel-ownership-transfer': PublicKey, // Return canceler address
  };

  deploy(args: DeployArgs & CustomDeployArgs) {
    super.deploy(args);
    this.ownableInitialize(args.owner);
  }

  @method ownableInitialize(txSender: PublicKey) {
    this.owner.set(txSender);
    this.pendingOwner.set(PublicKey.empty());
    this.ownerTransferInitializer.set(Bool(false));
  }

  /**
   * @dev Throws error if called by any account other than the owner.
   * It removes ownership in the contract.
   * It emits a `renounce-ownership` event.
   */
  @method renounceOwnership() {
    AccountUpdate.createSigned(this.sender);
    this.sender.assertEquals(this.owner.getAndRequireEquals());
    this.owner.set(PublicKey.empty());

    this.emitEvent('renounce-ownership', this.owner.get());
  }

  /**
   * @dev Throws error if called by any account other than the owner.
   * @param newOwner The address to transfer ownership to.
   * It transfers ownership of the contract to a new account (`newOwner`).
   * It emits a `transfer-ownership` event.
   */
  @method transferOwnership(newOwner: PublicKey) {
    AccountUpdate.createSigned(this.sender);
    this.sender.assertEquals(this.owner.getAndRequireEquals());
    this.pendingOwner.getAndRequireEquals().assertEquals(PublicKey.empty());
    this.ownerTransferInitializer
      .getAndRequireEquals()
      .assertEquals(Bool(false));

    this.pendingOwner.set(newOwner);
    this.ownerTransferInitializer.set(Bool(true));

    this.emitEvent('transfer-ownership', newOwner);
  }

  /**
   * @dev Throws error if called by any account other than the pending owner or the owner.
   * It accepts ownership transfer in the contract.
   * It emits a `accept-ownership` event.
   */
  @method acceptOwnership() {
    AccountUpdate.createSigned(this.sender);
    this.sender.assertEquals(this.pendingOwner.getAndRequireEquals());
    this.ownerTransferInitializer
      .getAndRequireEquals()
      .assertEquals(Bool(true));

    this.owner.set(this.sender);
    this.pendingOwner.set(PublicKey.empty());
    this.ownerTransferInitializer.set(Bool(false));

    const owner = this.owner.getAndRequireEquals();

    this.emitEvent('accept-ownership', owner);
  }

  /**
   * @dev Throws error if called by any account other than the pending owner or the owner.
   * It cancels ownership transfer in the contract.
   * It emits a `cancel-ownership-transfer` event.
   */
  @method cancelOwnershipTransfer() {
    AccountUpdate.createSigned(this.sender);
    const owner = this.owner.getAndRequireEquals();
    const pendingOwner = this.pendingOwner.getAndRequireEquals();
    Bool.or(this.sender.equals(owner), this.sender.equals(pendingOwner));

    this.pendingOwner.set(PublicKey.empty());
    this.ownerTransferInitializer.set(Bool(false));

    this.emitEvent('cancel-ownership-transfer', this.sender);
  }
}
