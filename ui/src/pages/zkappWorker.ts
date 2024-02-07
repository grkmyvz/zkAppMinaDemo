import { Field, MerkleTree, Mina, PublicKey, UInt32, fetchAccount } from "o1js";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import {
  zkAnvil,
  User,
  ZkAnvilMerkleWitness,
  Item,
} from "../../../contracts/src/zkAnvil";

const state = {
  zkAnvil: null as null | typeof zkAnvil,
  zkapp: null as null | zkAnvil,
  transaction: null as null | Transaction,
};

// ---------------------------------------------------------------------------------------

const functions = {
  setActiveInstanceToBerkeley: async (args: {}) => {
    const Berkeley = Mina.Network(
      "https://proxy.berkeley.minaexplorer.com/graphql"
    );
    console.log("Berkeley Instance Created");
    Mina.setActiveInstance(Berkeley);
  },
  loadContract: async (args: {}) => {
    const { zkAnvil } = await import("../../../contracts/build/src/zkAnvil.js");
    state.zkAnvil = zkAnvil;
  },
  compileContract: async (args: {}) => {
    await state.zkAnvil!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.zkAnvil!(publicKey);
  },
  // getNum: async (args: {}) => {
  //   const currentNum = await state.zkapp!.num.get();
  //   return JSON.stringify(currentNum.toJSON());
  // },
  // createUpdateTransaction: async (args: {}) => {
  //   const transaction = await Mina.transaction(() => {
  //     state.zkapp!.update();
  //   });
  //   state.transaction = transaction;
  // },
  getMerkleRoot: async (args: {}): Promise<Field> => {
    const merkleRoot = state.zkapp!.merkleRoot.get();
    return merkleRoot;
  },
  createAddUserTransaction: async (args: { publicKey: PublicKey }) => {
    // const user: User = new User({
    //   publicKey: args.publicKey,
    //   items: Array.from({ length: 6 }, () => {
    //     return new Item({
    //       id: UInt32.from(0),
    //       upgrade: UInt32.from(0),
    //     });
    //   }),
    // });
    // const tree = new MerkleTree(8);
    // const w = tree.getWitness(0n);
    // const path = new ZkAnvilMerkleWitness(w);
    // const transaction = await Mina.transaction(() => {
    //   state.zkapp!.addUser(user, path);
    // });
    // state.transaction = transaction;
  },
  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};

if (typeof window !== "undefined") {
  addEventListener(
    "message",
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      const returnData = await functions[event.data.fn](event.data.args);

      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  );
}

console.log("Web Worker Successfully Initialized.");
