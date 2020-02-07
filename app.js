const StagingUtils = require('./stagingUtils');

async function main() {
  console.log("WE ARE CALLED!!!!!");
  const patchFlag = process.argv[2];
  const buildSize = process.argv[3];

  let upstreamConfig;
  let upstreamName;
  let upstreamOwnerAndName;
  // let repoName;
  let localBranch;
  let userEmail;
  const newHead = 'newHead';

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



  //const repoOwner = StagingUtils.getGitUser(url);

  // try {
  //   repoName = StagingUtils.getRepoName(url);
  // } catch (error) {
  //   return;
  // }

  try {
    localBranch = await StagingUtils.getBranchName();
  } catch (error) {
    console.error(error);
    return;
  }

  //branch name: upstream/master
  
  try {
    upstreamConfig = await StagingUtils.checkUpstreamConfiguration(localBranch);
    console.log("this is upstream config: ", upstreamConfig);
    upstreamConfig = upstreamConfig.replace(/\r?\n|\r/g, "");
   
  } catch (error) {
    console.error(error);
    return;
  }

  try {
    upstreamOwnerAndName = await StagingUtils.getUpstreamBranch();
    console.log('this is the upstream name ', upstreamOwnerAndName);
    console.log(' split owner and name ', upstreamOwnerAndName.split('/'));
  } catch (error) {
    console.error(error);
    return;
  }
  //repoOwner, repoName = mongodb, docs-bi-connector
  const [repoOwner, repoName] = upstreamOwnerAndName.split('/');
  console.log(repoOwner, repoName, upstreamOwnerAndName);
  const { upstr, branchName } = upstreamConfig.split('/');
  const url = `https://github.com/${repoOwner}/${repoName}.git`;
  console.log("this is the url " , url);
    // try {
    //   repoName = StagingUtils.getRepoName(url);
    // } catch (error) {
    //   return;
    // }


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
    );

    console.log("this is the payload \n", payLoad);
    // try {
    //   StagingUtils.insertJob(
    //     payLoad,
    //     `Github Push: ${repoOwner}/${repoName}`,
    //     repoOwner,
    //     userEmail,
    //   );
    // } catch (error) {
    //   console.error(error);
    // }
  }

  if (patchFlag === 'local') {
    console.log("before");
    const patch = await StagingUtils.getGitPatchFromLocal(upstreamName);
    const payLoad = StagingUtils.createPayload(
      repoName,
      branchName,
      upstreamConfig,
      repoOwner,
      url,
      patch,
      buildSize,
      newHead,
    );
    console.log("after?? ", payLoad);
    //console.log(payLoad);
    // try {
    //   await StagingUtils.insertJob(
    //     payLoad,
    //     `Github Push: ${repoOwner}/${repoName}`,
    //     repoOwner,
    //     userEmail,
    //   );
    // } catch (error) {
    //   console.error(error);
    // }
  }

  //await StagingUtils.deletePatchFile();
}

main();
