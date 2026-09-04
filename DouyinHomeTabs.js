/**
 * 抖音首页顶部精简
 * 仅保留“关注”和“推荐”。
 */

const FOLLOW_IDS = new Set([
  "homepage_follow",
  "follow",
]);

const RECOMMEND_IDS = new Set([
  "homepage_hot",
  "homepage_recommend",
  "recommend",
  "hot",
]);

function valuesOf(item) {
  if (!item || typeof item !== "object") return [];

  return [
    item.id,
    item.tab_id,
    item.tab_type,
    item.name,
    item.title,
    item.tab_name,
    item.text,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim().toLowerCase());
}

function isFollow(item) {
  return valuesOf(item).some(
    (value) => FOLLOW_IDS.has(value) || value === "关注",
  );
}

function isRecommend(item) {
  return valuesOf(item).some(
    (value) => RECOMMEND_IDS.has(value) || value === "推荐",
  );
}

function simplifyTabs(list) {
  if (!Array.isArray(list)) return false;

  const follow = list.find(isFollow);
  const recommend = list.find(isRecommend);

  // 仅当两个必要入口均被识别时才修改，避免接口变化导致导航为空。
  if (!follow || !recommend) return false;

  list.splice(0, list.length, follow, recommend);
  return true;
}

try {
  const body = JSON.parse($response.body);
  const candidates = [
    body.data,
    body.tabs,
    body.tab_list,
    body.homepage_tabs,
    body.homepage_tab_list,
    body.data?.data,
    body.data?.tabs,
    body.data?.tab_list,
    body.data?.homepage_tabs,
    body.data?.homepage_tab_list,
  ];

  const changed = candidates.some(simplifyTabs);

  if (!changed) {
    console.log("抖音首页精简：未识别到完整的关注/推荐入口，保持原响应");
  }

  $done({ body: JSON.stringify(body) });
} catch (error) {
  console.log(`抖音首页精简失败：${error}`);
  $done({});
}
