import { isDeferredExecutionResult } from '../execute';
import { toArray } from 'rxjs/operators';

import { StarWarsSchema } from './starWarsSchema';
import { GraphQLError } from 'graphql';
import { graphql } from './graphql';

describe('@defer Directive tests', () => {
  describe('Basic Queries', () => {
    it('Can @defer on scalar types', async done => {
      const query = `
        query HeroNameQuery {
          hero {
            id
            name @defer
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(true);
        if (isDeferredExecutionResult(result)) {
          expect(result.initialResult).toEqual({
            data: {
              hero: {
                id: '2001',
              },
            },
          });
          const patchesObserver = result.deferredPatchesObservable
            .pipe(toArray())
            .subscribe(patches => {
              expect(patches.length).toBe(1);
              expect(patches).toContainEqual({
                path: ['hero', 'name'],
                data: 'R2-D2',
              });
              done();
            });
        }
      } catch (error) {
        done(error);
      }
    });

    it('Can @defer on a field on a list type', async done => {
      const query = `
        query HeroNameAndFriendsQuery {
          hero {
            id
            name 
            friends {
              name @defer
            }
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(true);
        if (isDeferredExecutionResult(result)) {
          expect(result.initialResult).toEqual({
            data: {
              hero: {
                id: '2001',
                name: 'R2-D2',
                friends: [{}, {}, {}],
              },
            },
          });
          const patchesObserver = result.deferredPatchesObservable
            .pipe(toArray())
            .subscribe(patches => {
              expect(patches.length).toBe(3);
              expect(patches).toContainEqual({
                path: ['hero', 'friends', 0, 'name'],
                data: 'Luke Skywalker',
              });
              expect(patches).toContainEqual({
                path: ['hero', 'friends', 1, 'name'],
                data: 'Han Solo',
              });
              expect(patches).toContainEqual({
                path: ['hero', 'friends', 2, 'name'],
                data: 'Leia Organa',
              });
              done();
            });
        }
      } catch (error) {
        done(error);
      }
    });

    it('Can @defer on list type', async done => {
      const query = `
        query HeroNameAndFriendsQuery {
          hero {
            id
            name 
            friends @defer {
              name
            }
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(true);
        if (isDeferredExecutionResult(result)) {
          expect(result.initialResult).toEqual({
            data: {
              hero: {
                id: '2001',
                name: 'R2-D2',
              },
            },
          });
          const patchesObserver = result.deferredPatchesObservable
            .pipe(toArray())
            .subscribe(patches => {
              expect(patches.length).toBe(1);
              expect(patches).toContainEqual({
                path: ['hero', 'friends'],
                data: [
                  { name: 'Luke Skywalker' },
                  { name: 'Han Solo' },
                  { name: 'Leia Organa' },
                ],
              });
              done();
            });
        }
      } catch (error) {
        done(error);
      }
    });
  });
  describe('Nested Queries', () => {
    it('Can @defer on nested queries', async done => {
      const query = `
        query NestedQuery {
          hero {
            name
            appearsIn @defer
            friends {
              name
              appearsIn
              friends {
                name @defer
              }
            }
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(true);
        if (isDeferredExecutionResult(result)) {
          expect(result.initialResult).toEqual({
            data: {
              hero: {
                name: 'R2-D2',
                friends: [
                  {
                    name: 'Luke Skywalker',
                    appearsIn: ['NEWHOPE', 'EMPIRE', 'JEDI'],
                    friends: [{}, {}, {}, {}],
                  },
                  {
                    name: 'Han Solo',
                    appearsIn: ['NEWHOPE', 'EMPIRE', 'JEDI'],
                    friends: [{}, {}, {}],
                  },
                  {
                    name: 'Leia Organa',
                    appearsIn: ['NEWHOPE', 'EMPIRE', 'JEDI'],
                    friends: [{}, {}, {}, {}],
                  },
                ],
              },
            },
          });
          const patchesObserver = result.deferredPatchesObservable
            .pipe(toArray())
            .subscribe(patches => {
              expect(patches.length).toBe(12);
              expect(patches).toContainEqual({
                path: ['hero', 'friends', 0, 'friends', 0, 'name'],
                data: 'Han Solo',
              });
              expect(patches).toContainEqual({
                path: ['hero', 'appearsIn'],
                data: ['NEWHOPE', 'EMPIRE', 'JEDI'],
              });
              done();
            });
        }
      } catch (error) {
        done(error);
      }
    });

    it('Can @defer on fields nested within deferred fields', async done => {
      const query = `
        query NestedQuery {
          human(id: "1000") {
            name
            weapon @defer {
              name @defer
              strength
            }
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(true);
        if (isDeferredExecutionResult(result)) {
          expect(result.initialResult).toEqual({
            data: {
              human: {
                name: 'Luke Skywalker',
              },
            },
          });
          const patchesObserver = result.deferredPatchesObservable
            .pipe(toArray())
            .subscribe(patches => {
              expect(patches.length).toBe(2);
              expect(patches).toContainEqual({
                path: ['human', 'weapon'],
                data: {
                  strength: 'High',
                },
              });
              expect(patches).toContainEqual({
                path: ['human', 'weapon', 'name'],
                data: 'Light Saber',
              });
              done();
            });
        }
      } catch (error) {
        done(error);
      }
    });

    it('Can @defer on fields nested within deferred lists', async done => {
      const query = `
        query NestedQuery {
          human(id: "1002") {
            name
            friends @defer {
              id
              name @defer
            }
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(true);
        if (isDeferredExecutionResult(result)) {
          expect(result.initialResult).toEqual({
            data: {
              human: {
                name: 'Han Solo',
              },
            },
          });
          const patchesObserver = result.deferredPatchesObservable
            .pipe(toArray())
            .subscribe(patches => {
              expect(patches.length).toBe(4);
              expect(patches).toContainEqual({
                path: ['human', 'friends'],
                data: [
                  {
                    id: '1000',
                  },
                  {
                    id: '1003',
                  },
                  {
                    id: '2001',
                  },
                ],
              });
              expect(patches).toContainEqual({
                path: ['human', 'friends', 0, 'name'],
                data: 'Luke Skywalker',
              });
              done();
            });
        }
      } catch (error) {
        done(error);
      }
    });
  });

  describe('Error Handling', () => {
    it('Errors on a deferred field returned in the patch', async done => {
      const query = `
        query HeroNameQuery {
          hero {
            name
            secretBackstory @defer
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(true);
        if (isDeferredExecutionResult(result)) {
          expect(result.initialResult).toEqual({
            data: {
              hero: {
                name: 'R2-D2',
              },
            },
          });
          const patchesObserver = result.deferredPatchesObservable
            .pipe(toArray())
            .subscribe(patches => {
              expect(patches.length).toBe(1);
              expect(JSON.stringify(patches[0])).toBe(
                JSON.stringify({
                  path: ['hero', 'secretBackstory'],
                  errors: [
                    {
                      message: 'secretBackstory is secret.',
                      locations: [{ line: 5, column: 13 }],
                      path: ['hero', 'secretBackstory'],
                    },
                  ],
                }),
              );
              done();
            });
        }
      } catch (error) {
        done(error);
      }
    });

    it('Errors inside deferred field returned with patch for the deferred field', async done => {
      const query = `
        query HeroNameQuery {
          hero {
            name
            friends @defer {
              name
              secretBackstory
            }
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(true);
        if (isDeferredExecutionResult(result)) {
          expect(result.initialResult).toEqual({
            data: {
              hero: {
                name: 'R2-D2',
              },
            },
          });
          const patchesObserver = result.deferredPatchesObservable
            .pipe(toArray())
            .subscribe(patches => {
              expect(patches.length).toBe(1);
              expect(JSON.stringify(patches[0])).toBe(
                JSON.stringify({
                  path: ['hero', 'friends'],
                  data: [
                    {
                      name: 'Luke Skywalker',
                      secretBackstory: null,
                    },
                    {
                      name: 'Han Solo',
                      secretBackstory: null,
                    },
                    {
                      name: 'Leia Organa',
                      secretBackstory: null,
                    },
                  ],
                  errors: [
                    {
                      message: 'secretBackstory is secret.',
                      locations: [
                        {
                          line: 7,
                          column: 15,
                        },
                      ],
                      path: ['hero', 'friends', 0, 'secretBackstory'],
                    },
                    {
                      message: 'secretBackstory is secret.',
                      locations: [
                        {
                          line: 7,
                          column: 15,
                        },
                      ],
                      path: ['hero', 'friends', 1, 'secretBackstory'],
                    },
                    {
                      message: 'secretBackstory is secret.',
                      locations: [
                        {
                          line: 7,
                          column: 15,
                        },
                      ],
                      path: ['hero', 'friends', 2, 'secretBackstory'],
                    },
                  ],
                }),
              );
              done();
            });
        }
      } catch (error) {
        done(error);
      }
    });
  });

  describe('Non-nullable fields', () => {
    it('Throws error if @defer used on non-nullable field', async done => {
      const query = `
        query HeroIdQuery {
          hero {
            id @defer
            name
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(false);
        expect(JSON.stringify(result)).toBe(
          JSON.stringify({
            errors: [
              {
                message:
                  '@defer cannot be applied on non-nullable field Droid.id',
                locations: [
                  {
                    line: 4,
                    column: 13,
                  },
                ],
                path: ['hero', 'id'],
              },
            ],
            data: {
              hero: null,
            },
          }),
        );
        done();
      } catch (error) {
        done(error);
      }
    });

    it('Can @defer on parent of a non-nullable field', async done => {
      const query = `
        query HeroNonNullQuery {
          human(id: "1001") @defer {
            id 
            name
            nonNullField
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(true);
        expect(result.initialResult).toEqual({
          data: {},
        });
        const patchesObserver = result.deferredPatchesObservable
          .pipe(toArray())
          .subscribe(patches => {
            expect(patches.length).toBe(1);
            expect(JSON.stringify(patches[0])).toBe(
              JSON.stringify({
                path: ['human'],
                data: {
                  id: '1001',
                  name: 'Darth Vader',
                  nonNullField: null,
                },
                errors: [
                  {
                    message:
                      'Cannot return null for non-nullable field Human.nonNullField.',
                    locations: [
                      {
                        line: 6,
                        column: 13,
                      },
                    ],
                    path: ['human', 'nonNullField'],
                  },
                ],
              }),
            );
            done();
          });
      } catch (error) {
        done(error);
      }
    });

    it('Can @defer on child of a non-nullable field', async done => {
      const query = `
        query HeroSoulmateQuery {
          human(id: "1000") {
            id 
            name
            soulmate {
              name @defer
            }
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(true);
        expect(result.initialResult).toEqual({
          data: {
            human: {
              id: '1000',
              name: 'Luke Skywalker',
              soulmate: {},
            },
          },
        });
        const patchesObserver = result.deferredPatchesObservable
          .pipe(toArray())
          .subscribe(patches => {
            expect(patches.length).toBe(1);
            expect(JSON.stringify(patches[0])).toBe(
              JSON.stringify({
                path: ['human', 'soulmate', 'name'],
                data: 'Darth Vader',
              }),
            );
            done();
          });
      } catch (error) {
        done(error);
      }
    });

    // This is a particularly weird case where the initial response
    it('Throws error if @defer used on nested non-nullable field', async done => {
      const query = `
        query HeroSoulmateQuery {
          human(id: "1002") {
            id 
            name
            soulmate {
              id @defer
            }
          }
        }
      `;
      try {
        const result = await graphql(StarWarsSchema, query);
        expect(isDeferredExecutionResult(result)).toBe(false);
        expect(result).toEqual({
          errors: [
            {
              message:
                '@defer cannot be applied on non-nullable field Human.id',
              locations: [
                {
                  line: 7,
                  column: 15,
                },
              ],
              path: ['human', 'soulmate', 'id'],
            },
          ],
          data: {
            human: null,
          },
        });
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});