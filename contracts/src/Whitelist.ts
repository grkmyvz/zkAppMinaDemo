import { DeployArgs, Field, PublicKey, State, method, state } from 'o1js';
import { Ownable } from './Ownable';

interface CustomDeployArgs {
  owner: PublicKey;
}

export class Whitelist extends Ownable {
  @state(Field) public whitelistRoot = State<Field>();

  deploy(args: DeployArgs & CustomDeployArgs) {
    super.deploy(args);
    this.whitelistRoot.set(Field(0));
    this.ownableInitialize(args.owner);
  }

  @method setZeroWhitelistRoot() {
    this.whitelistRoot.set(Field(0));
  }
}
