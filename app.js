const StagingUtils = require('./stagingUtils');

async function main() {
  const patchFlag = process.argv[2];
  const buildSize = process.argv[3];

  let upstreamConfig;
  let upstreamOwnerAndName;
  let userEmail;
  let user;
  let localBranch;
  const newHead = '';

  try {
    const makefileOnly = await StagingUtils.checkForOnlyMakefileInDiff(patchFlag);
    if (makefileOnly) {
      const errormsg = 'You have only made changes to the Makefile, which can\'t be staged. Please make changes to content files and then stage';
      console.error(errormsg);
      return;
    }
  } catch (error) {
    return;
  }

  try {
    StagingUtils.validateConfiguration();
  } catch (error) {
    return;
  }

  if (patchFlag === undefined) {
    console.log(
      'You need a patch flag("commit" or "local") in your make command'
    );
    return;
  }

  let invalidFlag = false;

  if (patchFlag !== 'local' && patchFlag !== 'commit') {
    console.log(
      'Invalid patch flag. Use "commit" to stage a build from the committed work you have locally or use "local" to stage a build from the uncommitted work you have locally'
    );
    invalidFlag = true;
  }

  if (invalidFlag === true) {
    return;
  }

  try {
    userEmail = await StagingUtils.getGitEmail();
  } catch (error) {
    return;
  }

  try {
    localBranch = await StagingUtils.getBranchName();
  } catch (error) {
    console.error(error);
    return;
  }
  let repoInfo;

  try {
    upstreamConfig = await StagingUtils.checkUpstreamConfiguration(localBranch);
    upstreamConfig = upstreamConfig.replace(/\r?\n|\r/g, "");
  } catch (error) {
    console.error(error);
    return;
  }

  try {
    upstreamOwnerAndName = await StagingUtils.getUpstreamRepo();
  } catch (error) {
    console.error(error);
    return;
  }

  try {
    repoInfo = await StagingUtils.getRepoInfo();
    user = StagingUtils.getGitUser(repoInfo);
  } catch (error) {
    console.log("error ", error);
    return;
  }

  let [repoOwner, repoName] = upstreamOwnerAndName.split('/');
  const branchName = upstreamConfig.split('/')[1];
  const url = `https://github.com/${repoOwner}/${repoName}`;
  repoName = repoName.replace('.git', '');
  // toggle btwn create patch from commits or what you have saved locally
  if (patchFlag === 'commit') {
    let firstCommit;
    let lastCommit;

    // make sure they have made at least one commit
    try {
      await StagingUtils.getGitCommits();
    } catch (error) {
      console.error(error);
      return;
    }

    const patch = await StagingUtils.getGitPatchFromCommits();

    const payLoad = StagingUtils.createPayload(
      repoName,
      branchName,
      upstreamConfig,
      repoOwner,
      url,
      patch,
      buildSize,
      newHead,
      localBranch,
      'commit',
    );

    try {
      StagingUtils.insertJob(
        payLoad,
        `Github Push from Server Staging Scripts: ${user}/${repoName}`,
        user,
        userEmail,
      );
    } catch (error) {
      console.error(error);
    }
  }

  if (patchFlag === 'local') {
    const patch = await StagingUtils.getGitPatchFromLocal(upstreamConfig);
    const payLoad = StagingUtils.createPayload(
      repoName,
      branchName,
      upstreamConfig,
      repoOwner,
      url,
      patch,
      buildSize,
      newHead,
      localBranch,
      'local',
    );

    try {
      await StagingUtils.insertJob(
        payLoad,
        `Github Push: ${user}/${repoName}`,
        user,
        userEmail,
      );
    } catch (error) {
      console.error(error);
    }
  }

  await StagingUtils.deletePatchFile();
}

main();
