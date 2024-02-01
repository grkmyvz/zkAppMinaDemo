import { Mina, PublicKey, fetchAccount } from "o1js";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type {
  User,
  ZkAnvilMerkleWitness,
  zkAnvil,
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
  getMerkleRoot: async (args: {}) => {
    const merkleRoot = state.zkapp!.merkleRoot.get();
    return JSON.stringify(merkleRoot.toJSON());
  },
  createAddUserTransaction: async (args: {
    user: User;
    path: ZkAnvilMerkleWitness;
  }) => {
    const transaction = await Mina.transaction(() => {
      state.zkapp!.addUser(args.user, args.path);
    });
    state.transaction = transaction;
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
