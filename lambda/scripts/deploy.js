/**
 * Node.js script to deploy packaged Lambda functions to AWS.
 *
 * Usage:
 *   node lambda/scripts/deploy.js
 *   ENVIRONMENT=prod AWS_REGION=ap-southeast-1 node lambda/scripts/deploy.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { packageFunctions } = require('./package');

const LAMBDA_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(LAMBDA_ROOT, 'dist');
const FUNCTIONS_DIR = path.join(LAMBDA_ROOT, 'functions');

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const STAGE = process.env.ENVIRONMENT || process.env.STAGE || 'dev';

async function deployFunctions() {
  console.log(`==> Deploying Lambda functions to AWS (Region: ${REGION}, Stage: ${STAGE})`);

  // 1. Ensure dist directory has packaged zip files
  const functions = fs.readdirSync(FUNCTIONS_DIR).filter((file) => {
    return fs.statSync(path.join(FUNCTIONS_DIR, file)).isDirectory();
  });

  const missingZip = functions.some((f) => !fs.existsSync(path.join(DIST_DIR, `${f}.zip`)));
  if (missingZip) {
    console.log('==> One or more zip archives missing. Running packaging first...');
    packageFunctions();
  }

  // 2. Deploy each function
  for (const funcName of functions) {
    const functionName = `pm-${funcName}-${STAGE}`;
    const zipPath = path.join(DIST_DIR, `${funcName}.zip`);

    console.log(`\n==> Updating function code: ${functionName}...`);

    try {
      // Check if function exists in AWS
      execSync(`aws lambda get-function --function-name "${functionName}" --region "${REGION}"`, {
        stdio: 'ignore',
      });

      // Update function code
      execSync(
        `aws lambda update-function-code --function-name "${functionName}" --zip-file "fileb://${zipPath}" --region "${REGION}"`,
        {
          stdio: 'inherit',
        }
      );
      console.log(`    [Success] Deployed ${functionName}`);
    } catch (err) {
      console.warn(
        `    [Notice] Could not update ${functionName} directly via AWS CLI. Either function does not exist in target AWS account, or AWS credentials are not configured.`
      );
      console.log(`    Deploy artifact ready: fileb://${zipPath}`);
    }
  }

  console.log('\n==> Lambda deployment script completed.');
}

if (require.main === module) {
  deployFunctions();
}

module.exports = {
  deployFunctions,
};

