import nock from 'nock';
import rewire from 'rewire';
import sinon from 'sinon';
import config from '../src/config';
import testUsers from './users.json';
import utils from './utils';
import mattermost from '../src/lib/mattermost';
import controllerUtils from '../src/controllers/utils';

const mattermostUsers = [
  {
    id: 'membre.actif',
    email: `membre.actif@${config.domain}`,
  },
  {
    id: 'julien.dauphant',
    email: `julien.dauphant@${config.domain}`,
  },
  {
    id: 'thomas.guillet',
    email: `thomas.guillet@${config.domain}`,
  },
  {
    id: 'countdoesnotexist',
    email: `countdoesnotexist@${config.domain}`,
  },
];

const mattermostScheduler = rewire('../src/schedulers/mattermostScheduler');

describe('invite users to mattermost', () => {
  let clock;

  beforeEach(async () => {
    const date = new Date('2021-01-20T07:59:59+01:00');
    clock = sinon.useFakeTimers(date);
    utils.cleanMocks();
    utils.mockOvhTime();
  });

  afterEach(async () => {
    clock.restore();
  });

  it('invite users to team by emails', async () => {
    nock(/.*ovh.com/)
    .get(/^.*email\/domain\/.*\/account/)
    .reply(200, testUsers.map((user) => user.id));

    nock(/.*mattermost.incubateur.net/)
    .get(/^.*api\/v4\/users.*/)
    .reply(200, [...mattermostUsers]);
    nock(/.*mattermost.incubateur.net/)
    .get(/^.*api\/v4\/users.*/)
    .reply(200, []);

    nock(/.*mattermost.incubateur.net/)
    .post(/^.*api\/v4\/teams\/testteam\/invite\/email.*/)
    .reply(200, [{}, {}]).persist();

    const url = process.env.USERS_API || 'https://beta.gouv.fr';
    nock(url)
    .get((uri) => uri.includes('authors.json'))
    .reply(200, testUsers)
    .persist();
    const { inviteUsersToTeamByEmail } = mattermostScheduler;
    const result = await inviteUsersToTeamByEmail();
    result.length.should.be.equal(2);
  });

  it('create users to team by emails', async () => {
    nock(/.*ovh.com/)
    .get(/^.*email\/domain\/.*\/account/)
    .reply(200, testUsers.map((user) => user.id));

    nock(/.*mattermost.incubateur.net/)
    .get(/^.*api\/v4\/users.*/)
    .reply(200, [...mattermostUsers]);
    nock(/.*mattermost.incubateur.net/)
    .get(/^.*api\/v4\/users.*/)
    .reply(200, []);
    nock(/.*mattermost.incubateur.net/)
    .post(/^.*api\/v4\/users\?iid=.*/)
    .reply(200, []).persist();
    const sendEmailStub = sinon.stub(controllerUtils, 'sendMail').returns(true);
    const mattermostCreateUser = sinon.spy(mattermost, 'createUser');

    const url = process.env.USERS_API || 'https://beta.gouv.fr';
    nock(url)
    .get((uri) => uri.includes('authors.json'))
    .reply(200, testUsers)
    .persist();
    const { createUsersByEmail } = mattermostScheduler;
    const result = await createUsersByEmail();
    result.length.should.be.equal(1);
    mattermostCreateUser.calledOnce.should.be.true;
    sendEmailStub.calledOnce.should.be.true;
    sendEmailStub.restore();
    mattermostCreateUser.firstCall.args[0].email = `mattermost.newuser@${config.domain}`;
    mattermostCreateUser.firstCall.args[0].useranme = 'mattermost.newuser';
  });
});

const inactiveMattermostUsers = [
  {
    id: 'julien.dauphant',
    email: `julien.dauphant@${config.domain}`,
  },
];

describe('Reactivate current users on mattermost', () => {
  let clock;
  beforeEach(async () => {
    const date = new Date('2021-01-20T07:59:59+01:00');
    clock = sinon.useFakeTimers(date);
    utils.cleanMocks();
  });

  afterEach(async () => {
    clock.restore();
  });

  it('reactivate current users', async () => {
    nock(/.*mattermost.incubateur.net/)
    .get(/^.*api\/v4\/users.*/)
    .reply(200, [...inactiveMattermostUsers]);
    nock(/.*mattermost.incubateur.net/)
    .get(/^.*api\/v4\/users.*/)
    .reply(200, []);

    const postBatchMock = nock(/.*mattermost.incubateur.net/)
    .put(/^.*api\/v4\/users\/julien.dauphant\/active/)
    .reply(200, [{ status: 'ok' }]).persist();

    const url = process.env.USERS_API || 'https://beta.gouv.fr';
    nock(url)
    .get((uri) => uri.includes('authors.json'))
    .reply(200, testUsers)
    .persist();

    const { reactivateUsers } = mattermostScheduler;
    const result = await reactivateUsers();
    result.length.should.be.equal(1); // il n'y a qu'un utilisateur inactif simulé (julien.dauphant)
  });
});
