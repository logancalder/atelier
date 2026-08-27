(function () {
  function site(record) { return record.key?.split(":")[0] || "unknown"; }
  function slug(record) { return record.key?.split(":").slice(1).join(":") || ""; }
  function normalizedTitle(record) { return String(record.title || "").replace(/^\s*\d+\s*[.:-]?\s*/, "").toLowerCase().replace(/\b(the|a|an)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim(); }
  function orderTime(record) { return new Date(record.sortAt || 0).valueOf() || 0; }
  function withNeetCodeData(group) {
    if (site(group.parent) !== "leetcode" || !group.children.length) return group;
    const dataRecord = [...group.children].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    const canonical = {
      ...dataRecord,
      title: group.parent.title,
      titleSource: "leetcode",
      linkedLeetcodeKey: group.parent.key
    };
    return { parent: canonical, children: group.children.filter((child) => child.key !== dataRecord.key) };
  }
  function group(records) {
    const leetcode = records.filter((record) => site(record) === "leetcode");
    const groups = leetcode.map((parent) => ({ parent, children: [] }));
    const bySlug = new Map(groups.map((item) => [slug(item.parent), item]));
    const byTitle = new Map(groups.map((item) => [normalizedTitle(item.parent), item]));
    for (const record of records.filter((item) => site(item) !== "leetcode")) {
      const match = (record.leetcodeSlug && bySlug.get(record.leetcodeSlug)) || byTitle.get(normalizedTitle(record));
      if (match) match.children.push(record); else groups.push({ parent: record, children: [] });
    }
    return groups.map(withNeetCodeData).sort((a, b) => orderTime(b.parent) - orderTime(a.parent) || String(a.parent.title).localeCompare(String(b.parent.title)));
  }
  window.SolveNotesGroups = { group, site };
})();
