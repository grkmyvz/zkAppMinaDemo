import { UInt32 } from 'o1js';
import { Item } from './zkAnvil';

export const itemList: { [key: number]: Item } = {
  1001: {
    id: UInt32.from(1001), // Raptor
    upgrade: UInt32.from(1),
  } as Item,
  2001: {
    id: UInt32.from(2001), // Shard
    upgrade: UInt32.from(1),
  } as Item,
  3001: {
    id: UInt32.from(3001), // Elixir Staff
    upgrade: UInt32.from(1),
  } as Item,
  4001: {
    id: UInt32.from(4001), // Dread Shield
    upgrade: UInt32.from(1),
  } as Item,
};
