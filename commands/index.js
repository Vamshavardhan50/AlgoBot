import setup from "./admin/setup.js";
import contestChannel from "./admin/contest-channel.js";
import contestRole from "./admin/contest-role.js";
import potdChannel from "./admin/potd-channel.js";
import potdRole from "./admin/potd-role.js";
import resourceChannel from "./admin/resource-channel.js";

import contestAdd from "./contest/add.js";
import contestRemove from "./contest/remove.js";
import contestList from "./contest/list.js";
import contestSend from "./contest/send.js";
import contestFetch from "./contest/fetch.js";

import potdAdd from "./potd/add.js";
import potdRemove from "./potd/remove.js";
import potdList from "./potd/list.js";
import potdSend from "./potd/send.js";

import resourceShare from "./resources/share.js";
import resourceEdit from "./resources/edit.js";
import resourceDelete from "./resources/delete.js";
import resourceList from "./resources/list.js";

import embedCreate from "./embeds/create.js";
import embedPreview from "./embeds/preview.js";
import embedSend from "./embeds/send.js";
import embedClear from "./embeds/clear.js";

import handle from "./handles/handle.js";
import profile from "./handles/profile.js";
import duel from "./duels/duel.js";
import starboard from "./duels/starboard.js";
import help from "./general/help.js";

export const commands = [
  setup,
  contestChannel,
  contestRole,
  potdChannel,
  potdRole,
  resourceChannel,
  contestAdd,
  contestRemove,
  contestList,
  contestSend,
  contestFetch,
  potdAdd,
  potdRemove,
  potdList,
  potdSend,
  resourceShare,
  resourceEdit,
  resourceDelete,
  resourceList,
  embedCreate,
  embedPreview,
  embedSend,
  embedClear,
  handle,
  profile,
  duel,
  starboard,
  help,
];
