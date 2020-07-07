import shelljs from "shelljs";
import chalk from "chalk";
import path from "path";
import { fileExists, createFile, readFile } from "./file-utils";
import { getLocalRcFile } from "./config-utils";

async function inExistingProject(folderPath) {
  const packageJsonExists = await fileExists(
    path.join(process.projectDir, folderPath, "package.json")
  );
  return packageJsonExists;
}

export function diff(x, y) {
  return x.filter((a) => !y.includes(a));
}

export async function setupNpmProject(folderPath) {
  return new Promise(async (resolve, _) => {
    const isExistingProject = await inExistingProject(folderPath);
    if (!isExistingProject) {
      console.log(
        chalk.greenBright(
          "Initialising NPM project in",
          chalk.cyanBright(folderPath)
        )
      );
      shelljs.exec(`cd ${folderPath} && npm init --yes`, {
        silent: true,
      });
    } else {
      console.log(chalk.greenBright("Existing NPM project detected.\n"));
    }
    console.log(chalk.greenBright("Installing MacroCore"));
    shelljs.exec(`cd ${folderPath} && npm i macrocore --save`, {
      silent: true,
    });
    return resolve();
  });
}

export async function setupGitIgnore(folderPath) {
  const gitIgnoreFilePath = path.join(
    process.projectDir,
    folderPath,
    ".gitignore"
  );
  const gitIgnoreExists = await fileExists(gitIgnoreFilePath);
  if (gitIgnoreExists) {
    const gitIgnoreContent = await readFile(gitIgnoreFilePath);
    await createFile(gitIgnoreFilePath, `${gitIgnoreContent}\nsasjsbuild/\n`);
    console.log(chalk.greenBright("Existing .gitignore is updated."));
  } else {
    await createFile(gitIgnoreFilePath, "node_modules/\nsasjsbuild/\n.env\n");
    console.log(chalk.greenBright("Created .gitignore file."));
  }
}

export async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

export function removeComments(text) {
  const lines = text.split("\n").map((l) => l.trim());
  const linesWithoutComment = [];
  let inCommentBlock = false;
  lines.forEach((line) => {
    if (line.includes("/*") && line.includes("*/")) {
      linesWithoutComment.push(line);
    } else {
      if (line.startsWith("/*") && !line.endsWith("*/")) {
        inCommentBlock = true;
      }
      if (!inCommentBlock) {
        linesWithoutComment.push(line);
      }
      if (line.endsWith("*/") && !line.includes("/*") && inCommentBlock) {
        inCommentBlock = false;
      }
    }
  });
  return linesWithoutComment.filter((l) => !!l.trim()).join("\n");
}

export function getUniqServicesObj(services) {
  let returnObj = {};
  if (!services) return returnObj;
  services.forEach((service) => {
    const serviceName = service.split("/").pop();
    if (returnObj[serviceName]) return;
    returnObj[serviceName] = service;
  });
  return returnObj;
}

export async function executeShellScript(filePath, logFilePath) {
  return new Promise(async (resolve, reject) => {
    const result = shelljs.exec(`bash ${filePath}`, {
      silent: true,
      async: false,
    });
    if (result.code) {
      console.error(chalk.redBright("Error:\n"), chalk.red(result.stderr));
      reject(result.code);
      throw new Error(chalk.cyanBright("Ended with code " + result.code));
    } else {
      if (logFilePath) {
        await createFile(logFilePath, result.stdout);
      }
      resolve(result.stdout);
    }
  });
}

export function chunk(text, maxLength = 220) {
  if (text.length <= maxLength) {
    return [text];
  }
  return `${text}`
    .match(new RegExp(".{1," + maxLength + "}", "g"))
    .filter((m) => !!m);
}

export async function getVariable(name, target) {
  let value = process.env[name];
  if (value) {
    return value;
  }
  value = target && target.tgtDeployVars ? target.tgtDeployVars[name] : null;
  if (value) {
    return value;
  }
  value = target && target.tgtBuildVars ? target.tgtBuildVars[name] : null;
  if (value) {
    return value;
  }

  const localRcFile = await getLocalRcFile();
  if (localRcFile && localRcFile.targets) {
    const currentTarget = localRcFile.targets.find(
      (t) => t.name === target.name
    );
    if (currentTarget) {
      value =
        currentTarget && currentTarget.tgtDeployVars
          ? currentTarget.tgtDeployVars[name]
          : null;
      if (value) {
        return value;
      }
      value =
        currentTarget && currentTarget.tgtBuildVars
          ? currentTarget.tgtBuildVars[name]
          : null;
      if (value) {
        return value;
      }
      return currentTarget && currentTarget.authInfo
        ? currentTarget.authInfo[name]
        : null;
    }
    return null;
  }
}
