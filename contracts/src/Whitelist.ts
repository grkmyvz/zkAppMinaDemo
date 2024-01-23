import { DeployArgs, Field, PublicKey, State, method, state } from 'o1js';
import { Ownable } from './Ownable';

interface CustomDeployArgs {
  owner: PublicKey;
}

export class Whitelist extends Ownable {
  @state(Field) public whitelistRoot = State<Field>();

  deploy(args: DeployArgs & CustomDeployArgs) {
    super.deploy(args);
    this.ownableInitialize(args.owner);
  }

  // TODO: Implement in deploy
  @method initializer() {
    this.whitelistRoot.set(Field(0));
  }
}
