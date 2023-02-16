import { InMemoryDataSource } from './../../src/storage/memory/data-source';
import { CredentialStorage } from './../../src/storage/shared/credential-storage';
import { IDataStorage } from './../../src/storage/interfaces/data-storage';
import { CredentialWallet } from '../../src/credentials';
import { SearchError } from '../../src/storage/filters/jsonQuery';
import { cred1, cred2, cred3 } from './mock';
import { ProofQuery, W3CCredential } from '../../src/verifiable';
import { BrowserDataSource } from '../../src/storage/local-storage/data-source';

class LocalStorageMock {
  store: object;
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = value;
  }

  removeItem(key: string) {
    delete this.store[key];
  }
}

global.localStorage = new LocalStorageMock() as unknown as Storage;

const credentialFlow = async (storage: IDataStorage) => {
  const credentialWallet = new CredentialWallet(storage);

  await credentialWallet.saveAll([cred1, cred2]);

  const credentials = await credentialWallet.list();
  expect(credentials.length).toBe(2);

  await credentialWallet.save(cred3);
  const credentialAll = await credentialWallet.list();
  expect(credentialAll.length).toBe(3);

  // present id
  const credById = await credentialWallet.findById(cred2.id);
  expect(credById).toEqual(cred2);

  // not present id
  const emptyCredById = await credentialWallet.findById('otherId');
  expect(emptyCredById).toBeUndefined();

  // findByContextType
  const [credByContextType] = await credentialWallet.findByContextType('context1', 'type1_2');
  expect(credByContextType.id).toEqual(cred1.id);

  const queries: {
    query: ProofQuery;
    expected: W3CCredential[];
  }[] = [
    {
      query: {
        allowedIssuers: ['*'],
        type: 'type1_1'
      },
      expected: [cred1]
    },
    {
      query: {
        allowedIssuers: ['issuer3', 'issuer2']
      },
      expected: [cred3, cred2]
    },
    {
      query: {
        allowedIssuers: ['*'],
        context: 'context3_2',
        type: 'type3_3',
        schema: 'credentialSchemaId'
      },
      expected: [cred3]
    },
    {
      query: {
        allowedIssuers: ['*'],
        context: 'context2_2',
        type: 'type2_3',
        schema: 'credentialSchemaId',
        credentialSubject: {
          birthday: {
            $gt: 20000100
          }
        }
      },
      expected: [cred2]
    },
    {
      query: {
        allowedIssuers: ['*'],
        credentialSubject: {
          birthday: {
            $lt: 20000102
          }
        }
      },
      expected: [cred1, cred2]
    },
    {
      query: {
        allowedIssuers: ['*'],
        credentialSubject: {
          countryCode: {
            $eq: 120
          }
        }
      },
      expected: [cred3]
    },
    {
      query: {
        allowedIssuers: ['*'],
        credentialSubject: {
          countryCode: {
            $in: [11, 120]
          }
        }
      },
      expected: [cred3]
    },
    {
      query: {
        allowedIssuers: ['*'],
        credentialSubject: {
          countryCode: {
            $nin: [11, 111]
          }
        }
      },
      expected: [cred3]
    }
  ];

  for (const item of queries) {
    const creds = await credentialWallet.findByQuery(item.query);
    const expectedIds = item.expected.map(({ id }) => id);
    const credsIds = creds.map(({ id }) => id);
    expect(credsIds).toEqual(expect.arrayContaining(expectedIds));
  }

  // operator error
  const query = {
    allowedIssuers: ['*'],
    credentialSubject: {
      countryCode: {
        $custom: [11, 111]
      }
    }
  };
  await expect(credentialWallet.findByQuery(query)).rejects.toThrow(
    new Error(SearchError.NotDefinedComparator)
  );

  // invalid query
  const query2 = {
    allowedIssuers: ['*'],
    someProp: ''
  };
  await expect(credentialWallet.findByQuery(query2)).rejects.toThrow(
    new Error(SearchError.NotDefinedQueryKey)
  );

  // remove credential error
  await expect(credentialWallet.remove('unknowId')).rejects.toThrow(
    new Error('item not found to delete: unknowId')
  );

  await credentialWallet.remove('test1');
  const finalList = await credentialWallet.list();
  expect(finalList.length).toBe(2);
};

describe('credential-wallet', () => {
  it('run in memory with 3 credential', async () => {
    const storage = {
      credential: new CredentialStorage(new InMemoryDataSource<W3CCredential>())
    } as unknown as IDataStorage;
    await credentialFlow(storage);
  });
  it('run in local storage with 3 credential', async () => {
    const storage = {
      credential: new CredentialStorage(
        new BrowserDataSource<W3CCredential>(CredentialStorage.storageKey)
      )
    } as unknown as IDataStorage;
    await credentialFlow(storage);
  });
});
