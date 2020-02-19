const StagingUtils = require('./stagingUtils');

async function main() {
  console.log("ARE YOU OUT THERE?????")
  const patchFlag = process.argv[2];
  const buildSize = process.argv[3];

  let upstreamConfig;
  let upstreamOwnerAndName;
  let userEmail;
  let user;
  let localBranch;
  const newHead = '';

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
    upstreamOwnerAndName = await StagingUtils.getUpstreamBranch();
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

  const [repoOwner, repoName] = upstreamOwnerAndName.split('/');
  const branchName = upstreamConfig.split('/')[1];
  const url = `https://github.com/${repoOwner}/${repoName}.git`;

  // toggle btwn create patch from commits or what you have saved locally
  if (patchFlag === 'commit') {
    let firstCommit;
    let lastCommit;

    try {
      const commits = await StagingUtils.getGitCommits();
      [firstCommit, lastCommit] = commits;
    } catch (error) {
      console.error(error);
      return;
    }

    const patch = await StagingUtils.getGitPatchFromCommits(
      firstCommit,
      lastCommit,
    );

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
    );


    // try {
    //   StagingUtils.insertJob(
    //     payLoad,
    //     `Github Push from Server Staging Scripts: ${repoOwner}/${repoName}`,
    //     user,
    //     userEmail,
    //   );
    // } catch (error) {
    //   console.error(error);
    // }
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
    );

    // try {
    //   await StagingUtils.insertJob(
    //     payLoad,
    //     `Github Push: ${user}/${repoName}`,
    //     user,
    //     userEmail,
    //   );
    // } catch (error) {
    //   console.error(error);
    // }
  }

  await StagingUtils.deletePatchFile();
}

main();
