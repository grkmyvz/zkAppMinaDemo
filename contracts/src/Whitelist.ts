import {
  DeployArgs,
  Field,
  MerkleTree,
  MerkleWitness,
  Poseidon,
  PublicKey,
  SmartContract,
  State,
  method,
  state,
} from 'o1js';

export class Whitelist extends SmartContract {
  @state(Field) public whitelistRoot = State<Field>();

  @method init() {
    super.init();
    this.whitelistRoot.set(Field(0));
  }

  @method addAddress(address: PublicKey) {
    const currentRoot = this.whitelistRoot.getAndRequireEquals();
    const newLeaf = Poseidon.hash([address.toFields()[0]]);
    const newRoot = MerkleTree.update(currentRoot, newLeaf);
    this.whitelistRoot.set(newRoot);
  }
}
