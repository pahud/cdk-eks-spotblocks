const {
  AwsCdkConstructLibrary,
  GithubWorkflow,
} = require('projen');

const AWS_CDK_LATEST_RELEASE = '1.62.0';
const PROJECT_NAME = 'eks-spot-blocks';
const PROJECT_DESCRIPTION = 'A sample JSII construct lib for AWS CDK';
const AUTOMATION_TOKEN = 'AUTOMATION_GITHUB_TOKEN';


const project = new AwsCdkConstructLibrary({
  name: PROJECT_NAME,
  description: PROJECT_DESCRIPTION,
  repository: 'https://github.com/pahud/cdk-eks-spotblocks.git',
  authorName: 'Pahud Hsieh',
  authorEmail: 'pahudnet@gmail.com',
  stability: 'experimental',
  antitamper: false,

  keywords: [
    'cdk',
    'aws',
    'eks',
    'spot',
    'spot-blocks'
  ],

  catalog: {
    twitter: 'pahudnet',
    announce: false,
  },

  // creates PRs for projen upgrades
  // projenUpgradeSecret: 'PROJEN_GITHUB_TOKEN',


  cdkVersion: AWS_CDK_LATEST_RELEASE,
  cdkDependencies: [
    '@aws-cdk/core',
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-eks',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-ssm',
  ],


  python: {
    distName: 'eks-spot-blocks',
    module: 'eks_spot_blocks'
  }
});


// create a custom projen and yarn upgrade workflow
const workflow = new GithubWorkflow(project, 'ProjenYarnUpgrade');

workflow.on({
  schedule: [{
    cron: '0 6 * * *'
  }], // 6am every day
  workflow_dispatch: {}, // allow manual triggering
});

workflow.addJobs({
  upgrade: {
    'runs-on': 'ubuntu-latest',
    'steps': [
      ...project.workflowBootstrapSteps,

      // yarn upgrade
      {
        run: `yarn upgrade`
      },

      // upgrade projen
      {
        run: `yarn projen:upgrade`
      },

      // submit a PR
      {
        name: 'Create Pull Request',
        uses: 'peter-evans/create-pull-request@v3',
        with: {
          'token': '${{ secrets.' + AUTOMATION_TOKEN + '}}',
          'commit-message': 'chore: upgrade projen',
          'branch': 'auto/projen-upgrade',
          'title': 'chore: upgrade projen and yarn',
          'body': 'This PR upgrades projen and yarn upgrade to the latest version',
        }
      },
    ],
  },
});

project.mergify.addRule({
  name: 'Merge pull requests for projen upgrade if CI passes',
  conditions: [
    'author=cdk-automation',
    'status-success=build',
    'title=chore: upgrade projen',
  ],
  actions: {
    merge: {
      method: 'merge',
      commit_message: 'title+body',
    },
  },
});


const common_exclude = ['cdk.out', 'cdk.context.json', 'images', 'yarn-error.log'];
project.npmignore.exclude(...common_exclude);
project.gitignore.exclude(...common_exclude);


project.synth();
