#!/usr/bin/env node
require('colors');
const path = require("path")
const glob = require("glob")
const Promise = require('bluebird');
const Diff = require('diff');
const fs = Promise.promisifyAll(require('fs'));
const configRegex = /\"runtimeConfig\":({.*?})/g;
(async () => {
	const nextConfigJsPath = path.resolve(process.cwd(), "next.config.js");
	const nextConfig = require(nextConfigJsPath)
	const {
		publicRuntimeConfig
	} = nextConfig
	const nextBuildGlobPattern = path.resolve(process.cwd(), ".next", "**", "*.{js,html,json}")
	const files = glob.sync(nextBuildGlobPattern);
	let oldConfig
	const promises = []
	for(const filePath of files) {
		promises.push((async () => {
			try {
				const isDirectory = fs.lstatSync(filePath).isDirectory()
				if(isDirectory) {
					return
				}
				const fileContent = await fs.readFileAsync(filePath, "utf8")
				const match = configRegex.exec(fileContent)
				if(!oldConfig && match?.length > 0) {
					oldConfig = JSON.parse(match[1])
				}
				const newFileContent = fileContent
					.replaceAll(
						configRegex,
						`\"runtimeConfig\":${JSON.stringify(publicRuntimeConfig)}`
					)
				await fs.writeFileAsync(filePath, newFileContent, "utf8")
			}
			catch(e) {
				console.log("file", filePath)
				console.log(e)
			}
		})())
	}
	await Promise.all(promises)
	const diff = Diff.diffChars(
		JSON.stringify(oldConfig, null, 2),
		JSON.stringify(publicRuntimeConfig, null, 2)
		)
	process.stdout.write("Changes:\n");
	diff.forEach((part) => {
		const color = part.added ? 'green' :
		  part.removed ? 'red' : 'grey';
		process.stdout.write(part.value[color]);
	});
})()