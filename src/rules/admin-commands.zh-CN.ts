export type AdminCommand = {
  command: string;
  description: string;
  usage: string;
  aliases?: string[];
};

export const ADMIN_COMMANDS: AdminCommand[] = [
  {
    command: "additem",
    description: "给玩家物品",
    usage: 'additem "username" Base.Axe 5',
  },
  {
    command: "adduser",
    description: "白名单服添加用户",
    usage: 'adduser "username" "password"',
  },
  {
    command: "addvehicle",
    description: "生成载具",
    usage: 'addvehicle "Base.VanAmbulance" "username"',
  },
  {
    command: "addxp",
    description: "给玩家经验",
    usage: 'addxp "username" Woodwork=2',
  },
  {
    command: "alarm",
    description: "在当前位置触发建筑警报",
    usage: "alarm",
  },
  {
    command: "banid",
    description: "封禁 SteamID",
    usage: "banid 7656xxxxxxxxxxxx",
  },
  {
    command: "banuser",
    description: "封禁用户（可附带 IP/原因）",
    usage: 'banuser "username" -ip -r "reason"',
  },
  {
    command: "changeoption",
    description: "修改服务器选项",
    usage: 'changeoption PVP "true"',
  },
  {
    command: "checkModsNeedUpdate",
    description: "检查 mod 是否更新",
    usage: "checkModsNeedUpdate",
  },
  {
    command: "chopper",
    description: "在随机玩家处触发直升机事件",
    usage: "chopper",
  },
  {
    command: "clear",
    description: "清空服务器控制台输出",
    usage: "clear",
  },
  {
    command: "createhorde",
    description: "在玩家附近刷尸群",
    usage: 'createhorde 150 "username"',
  },
  {
    command: "createhorde2",
    description: "高级刷尸群（参数依版本）",
    usage: "createhorde2 ...",
  },
  {
    command: "godmod",
    description: "无敌模式（部分版本写作 godmode）",
    usage: 'godmode "username" -true',
    aliases: ["godmode"],
  },
  {
    command: "gunshot",
    description: "在随机玩家处触发枪声事件",
    usage: "gunshot",
  },
  {
    command: "help",
    description: "查看命令帮助",
    usage: "help",
  },
  {
    command: "invisible",
    description: "隐身（对僵尸不可见）",
    usage: 'invisible "username" -true',
  },
  {
    command: "kick",
    description: "踢出用户（可附原因）",
    usage: 'kickuser "username" -r "reason"',
  },
  {
    command: "lightning",
    description: "对目标触发闪电",
    usage: 'lightning "username"',
  },
  {
    command: "log",
    description: "设置日志级别",
    usage: 'log "Network" "Debug"',
  },
  {
    command: "noclip",
    description: "穿墙开关",
    usage: 'noclip "username" -true',
  },
  {
    command: "players",
    description: "列出在线玩家",
    usage: "players",
  },
  {
    command: "quit",
    description: "保存并关闭服务器",
    usage: "quit",
  },
  {
    command: "releasesafehouse",
    description: "释放自己拥有的安全屋",
    usage: "releasesafehouse",
  },
  {
    command: "reloadlua",
    description: "重载 Lua 脚本",
    usage: 'reloadlua "filename"',
  },
  {
    command: "reloadoptions",
    description: "重载 ServerOptions 并同步客户端",
    usage: "reloadoptions",
  },
  {
    command: "removeuserfromwhitelist",
    description: "从白名单移除用户",
    usage: 'removeuserfromwhitelist "username"',
  },
  {
    command: "removezombies",
    description: "删除僵尸（参数依版本）",
    usage: "removezombies ...",
  },
  {
    command: "replay",
    description: "录制/播放回放",
    usage: 'replay "user1" -record file.bin',
  },
  {
    command: "save",
    description: "保存世界",
    usage: "save",
  },
  {
    command: "servermsg",
    description: "全服广播消息",
    usage: 'servermsg "My Message"',
  },
  {
    command: "setaccesslevel",
    description: "设置玩家权限等级",
    usage: 'setaccesslevel "username" "moderator"',
  },
  {
    command: "showoptions",
    description: "显示当前服务器选项与值",
    usage: "showoptions",
  },
  {
    command: "startrain",
    description: "开始下雨",
    usage: "startrain 50",
  },
  {
    command: "startstorm",
    description: "开始风暴",
    usage: "startstorm 24",
  },
  {
    command: "stats",
    description: "输出/控制服务器统计",
    usage: "stats file 10",
  },
  {
    command: "stoprain",
    description: "停止下雨",
    usage: "stoprain",
  },
  {
    command: "stopweather",
    description: "停止天气效果",
    usage: "stopweather",
  },
  {
    command: "teleport",
    description: "玩家间传送/传到玩家",
    usage: 'teleport "username"',
  },
  {
    command: "teleportto",
    description: "传送到坐标",
    usage: "teleportto 10000,11000,0",
  },
  {
    command: "thunder",
    description: "对目标触发雷声",
    usage: 'thunder "username"',
  },
  {
    command: "unbanid",
    description: "解封 SteamID",
    usage: "unbanid 7656xxxxxxxxxxxx",
  },
  {
    command: "unbanuser",
    description: "解封用户",
    usage: 'unbanuser "username"',
  },
  {
    command: "voiceban",
    description: "禁用玩家语音",
    usage: 'voiceban "username" -true',
  },
];

export function searchCommands(prefix: string): AdminCommand[] {
  const normalizedPrefix = prefix.toLowerCase().trim();

  if (!normalizedPrefix) {
    return [];
  }

  return ADMIN_COMMANDS.filter((cmd) => {
    const matchCommand = cmd.command.toLowerCase().startsWith(normalizedPrefix);
    const matchAliases = cmd.aliases?.some((a) =>
      a.toLowerCase().startsWith(normalizedPrefix),
    );
    return matchCommand || matchAliases;
  });
}
