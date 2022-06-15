#!/usr/bin/env node

const commandLineArgs = require("command-line-args");

const enrichmentAddress = require("../main");

const options = commandLineArgs([
  {
    name: "string",
    alias: "s",
    type: String,
    typeLabel: "{underline string}",
    description: "変換対象とする住所文字列",
  },
]);

const sleep = (millisecond = 3000) =>
  new Promise((resolve) => setTimeout(resolve, millisecond));

(async function main() {
  console.info("Creating imi-enrichment-address instance");
  await sleep();

  const text = options.string;

  if (typeof text !== "string") throw new Error("required string type");
  if (text === "") throw new Error("required string values");

  // const result = await instance.convert(text);
  const result = await enrichmentAddress.convert(text);
  console.info("Result", result);

  console.info("Closing imi-enrichment-address instance");
  await sleep();

  enrichmentAddress.disconnect();
})();
