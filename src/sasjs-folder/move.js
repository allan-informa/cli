import { displayResult } from '../utils/displayResult'

export const move = async (paths, sasjs, accessToken) => {
  const pathMap = paths.split(' ')

  if (pathMap.length !== 2) {
    console.log(
      chalk.redBright(
        `Bad command.\nCommand example: sasjs folder move /Public/sourceFolder /Public/targetFolder`
      )
    )

    return
  }

  const sourceFolder = pathMap[0]
  let targetFolder = pathMap[1].split('/')
  const targetFolderName = targetFolder.pop()
  targetFolder = targetFolder.join('/')

  const movedFolder = await sasjs
    .moveFolder(sourceFolder, targetFolder, targetFolderName, accessToken)
    .catch((err) => {
      displayResult(err)
    })

  if (movedFolder) {
    displayResult(
      null,
      null,
      `Folder successfully moved from '${sourceFolder}' to '${
        targetFolder + '/' + targetFolderName
      }'.`
    )
  }
}
