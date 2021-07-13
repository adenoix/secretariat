const config = require('../config');
require('./marrainageScheduler');
require('./emailCreationScheduler');
require('./newsletterScheduler');
require('./mattermostScheduler.js');
const { CronJob } = require('cron');

if (config.featureAddGithubUserToOrganization) {
  const { addGithubUserToOrganization } = require('./githubScheduler');

  module.exports.addGithubUserToOrganization = new CronJob(
    '0 */15 * * * 1-5',
    addGithubUserToOrganization,
    null,
    true,
    'Europe/Paris',
  );
}

if (config.featureRemoveGithubUserFromOrganization) {
  const { removeGithubUserFromOrganization } = require('./githubScheduler');

  module.exports.removeGithubUserFromOrganization = new CronJob(
    '0 0 * * * *',
    removeGithubUserFromOrganization,
    null,
    true,
    'Europe/Paris',
  );
}

if (config.featureCreateUserOnMattermost) {
  console.log('Cron job to create user on mattermost by email on');
  const { createUsersByEmail } = require('./mattermostScheduler');
  const createMattermostUsers = new CronJob(
    '0 */8 * * * *',
    createUsersByEmail,
    null,
    true,
    'Europe/Paris',
  );
} else {
  console.log('Cron job to create user on mattermost by email off');
}

const { onUserContractEnding } = require('./userContractEndingScheduler');

const onUserContractEndIn15days = new CronJob(
  '0 */8 * * * *',
  () => onUserContractEnding('mail15days'),
  null,
  true,
  'Europe/Paris',
);

const onUserContractEndIn2days = new CronJob(
  '0 */8 * * * *',
  () => onUserContractEnding('mail2days'),
  null,
  true,
  'Europe/Paris',
);
