/**
 * js/achievements.js — Achievements & Badges System
 */

export const BADGES = [
  {
    id: 'first_step',
    name: 'First Step',
    icon: '🚀',
    desc: 'Solved your 1st LeetCode problem',
    check: (problems, stats) => stats.solved >= 1,
    priority: 1
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    icon: '🔥',
    desc: 'Solved 5 or more problems',
    check: (problems, stats) => stats.solved >= 5,
    priority: 2
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    icon: '⚡',
    desc: 'Solved 5+ problems in Sub 20 minutes',
    check: (problems) => problems.filter(p => p.solved && p.solvedSub20 === 'Y').length >= 5,
    priority: 3
  },
  {
    id: 'first_try',
    name: 'Sharp Shooter',
    icon: '🎯',
    desc: 'Solved 10+ problems on the 1st try',
    check: (problems, stats) => stats.firstTry >= 10,
    priority: 4
  },
  {
    id: 'hard_core',
    name: 'Hard Core',
    icon: '🧠',
    desc: 'Solved at least 1 Hard difficulty problem',
    check: (problems, stats) => stats.hardSolved >= 1,
    priority: 5
  },
  {
    id: 'competence_king',
    name: 'Competence Master',
    icon: '🌟',
    desc: 'Marked 10+ problems as Competent',
    check: (problems, stats) => stats.competent >= 10,
    priority: 6
  },
  {
    id: 'tree_guru',
    name: 'Tree & Graph Guru',
    icon: '🌳',
    desc: 'Solved 10+ BFS, DFS, Graph or Tree problems',
    check: (problems) => problems.filter(p => p.solved && ['BFS','DFS','Graph','Binary Search'].includes(p.category)).length >= 10,
    priority: 7
  },
  {
    id: 'dp_master',
    name: 'Dynamic Master',
    icon: '⚡',
    desc: 'Solved 5+ Dynamic Programming problems',
    check: (problems) => problems.filter(p => p.solved && p.category === 'Dynamic Programming').length >= 5,
    priority: 8
  },
  {
    id: 'century',
    name: 'Century Club',
    icon: '🏆',
    desc: 'Solved 100+ LeetCode problems',
    check: (problems, stats) => stats.solved >= 100,
    priority: 9
  },
  {
    id: 'legend',
    name: 'LeetCode Legend',
    icon: '🥷',
    desc: 'Solved 200+ LeetCode problems',
    check: (problems, stats) => stats.solved >= 200,
    priority: 10
  }
];

export function getAchievements(problems, stats) {
  return BADGES.map(badge => {
    const unlocked = badge.check(problems, stats);
    return { ...badge, unlocked };
  });
}
