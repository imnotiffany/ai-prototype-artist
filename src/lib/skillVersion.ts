// 基于 Skill 名称生成稳定的版本号列表与最新版本
export function getSkillVersions(name: string): string[] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const minor = (h % 5) + 1;
  const patch = (h >>> 3) % 6;
  const latest = `v1.${minor}.${patch}`;
  const prevMinor = minor > 0 ? `v1.${minor - 1}.${(h >>> 5) % 5}` : null;
  const old = `v1.0.0`;
  return [latest, prevMinor, old].filter((v, i, a) => v && a.indexOf(v) === i) as string[];
}

export function getLatestSkillVersion(name: string): string {
  return getSkillVersions(name)[0];
}
