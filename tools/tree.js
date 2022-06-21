const readline = require("readline");
const fs = require("fs");
const simplify = require("../lib/util").simplify;
const chome = require("./chome");

//

const map = {};

(function () {
  // 基本情報の付与
  JSON.parse(
    simplify(fs.readFileSync(process.argv[2], "UTF-8"))
  ).results.bindings.forEach((e) => {
    const code = e.id.value
      .replace("http://data.e-stat.go.jp/lod/sac/C", "")
      .split("-")[0];
    const f = {
      id: e.id.value,
      label: e.label.value,
      parent: [],
      children: [],
      next: [],
      prev: [],
      visible: !!e.label.value.match(/[都道府県市区町村]$/),
      code: code,
      key: code + e.label.value,
    };
    map[f.id] = f;
  });

  // 上下関係の接続
  JSON.parse(
    simplify(fs.readFileSync(process.argv[3], "UTF-8"))
  ).results.bindings.forEach((e) => {
    const child = map[e.id.value];
    const parent = map[e.parent.value];
    if (child && parent) {
      if (child.parent.indexOf(parent) === -1) child.parent.push(parent);
      if (parent.children.indexOf(child) === -1) parent.children.push(child);
    } else {
      console.error("Invalid parent/child", e.id.value, e.parent.value);
    }
  });

  // 前後関係の接続
  JSON.parse(
    simplify(fs.readFileSync(process.argv[4], "UTF-8"))
  ).results.bindings.forEach((e) => {
    const prev = map[e.id.value];
    const next = map[e.next.value];
    if (next && prev) {
      if (prev.next.indexOf(next) === -1) prev.next.push(next);
      if (next.prev.indexOf(prev) === -1) next.prev.push(prev);
    } else {
      console.error("Invalid prev/next", e.id.value, e.next.value);
    }
  });
})();

const latest = {};
Object.values(map).forEach((e) => {
  if (latest[e.code] === undefined) latest[e.code] = e;
  else if (latest[e.code].id < e.id) latest[e.code] = e;
});

readline
  .createInterface({
    input: process.stdin,
  })
  .on("line", (line) => {
    const col = simplify(line).trim().replace(/"/g, "").split(",");
    if (col.length !== 10) return;
    const pref_code = col[0];
    const pref_name = col[1];
    const city_code = col[2];
    const city_name = col[3];
    const area_code = col[4];
    const area_name = col[5];

    if (!pref_code.match(/^[0-9]+$/)) return;

    const parent = latest[city_code];

    if (parent === undefined) {
      console.error("city_code not found", city_code);
      return;
    }

    let lower = parseInt(area_code.substring(9));
    let upper = area_code.substring(0, 9);
    let label =
      lower === 0 ? area_name : area_name.replace(chome[lower] + "丁目", "");
    if (label === "") {
      label = area_name;
      lower = 0;
      upper = area_code;
    }

    if (parent.children.find((x) => x.id === upper) === undefined)
      parent.children.push({
        id: upper,
        label: label,
        parent: [parent],
        children: [],
        visible: true,
        code: upper,
        max: 0,
        next: [],
        key: upper.substring(5) + label,
      });

    parent.children
      .filter((x) => x.id === upper)
      .forEach((x) => {
        x.max = Math.max(x.max, parseInt(lower));
      });
  })
  .on("close", () => {
    const root = {};

    const dig = function (src, container) {
      if (!src.visible) {
        src.children.forEach((child) => {
          dig(child, container);
        });
        return;
      }

      if (container[src.key] === undefined) {
        const next = [];
        const chase = function (a) {
          if (next.length > 0) return;
          if (a.key !== src.key && next.indexOf(a.key) === -1) next.push(a.key);
          else a.next.forEach(chase);
        };
        src.next.forEach(chase);

        if (src.max !== undefined) {
          container[src.key] = src.max;
        } else if (next.length > 0) {
          container[src.key] = next[0];
        } else {
          container[src.key] = {};
        }
      }
      src.children.forEach((child) => {
        dig(child, container[src.key]);
      });
    };

    // ルートを起点にトラバース
    Object.values(map)
      .filter((e) => e.parent.length === 0)
      .forEach((e) => {
        dig(e, root);
      });

    console.log(JSON.stringify(root, null, 1));
  });
