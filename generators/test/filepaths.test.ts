// import { filepaths, FilepathsOptions, folders } from "..";
import { describe, expect, it } from "vitest";
import { getCurrentInsertedDirectory, sortFilesAlphabetically } from "../src/filepaths";
// import { testQueryTerm, testTrigger } from "./keyvalue.test";

// function toName(suggestion: Fig.Suggestion): string {
//   return suggestion.name as string;
// }

const defaultHome = "/home/user";
const defaultCwd = `${defaultHome}/current_cwd`;

const defaultContext: Fig.GeneratorContext = {
  searchTerm: "",
  currentWorkingDirectory: defaultCwd,
  currentProcess: "zsh",
  sshPrefix: "",
  environmentVariables: {
    HOME: defaultHome,
  },
};

const defaultContextWithEnv = (env: Record<string, string>) => ({
  ...defaultContext,
  environmentVariables: {
    ...defaultContext.environmentVariables,
    ...env,
  },
});

describe("Test getCurrentInsertedDirectory", () => {
  it("returns root for null cwd", () => {
    expect(getCurrentInsertedDirectory(null, "foo/", defaultContext)).to.equal("/");
  });

  it("returns merged path when both cwd and search term are specified", () => {
    expect(getCurrentInsertedDirectory(defaultCwd, "test/", defaultContext)).to.equal(
      `${defaultCwd}/test/`
    );
  });

  it("returns partial path when trailing slash is missing (1)", () => {
    expect(getCurrentInsertedDirectory(defaultCwd, "src/packages", defaultContext)).to.equal(
      `${defaultCwd}/src/`
    );
  });

  it("returns partial path when trailing slash is missing (2)", () => {
    expect(getCurrentInsertedDirectory(defaultCwd, "src", defaultContext)).to.equal(
      `${defaultCwd}/`
    );
  });

  it("returns the entire search term if it is an absolute path relative to ~", () => {
    expect(
      getCurrentInsertedDirectory(defaultCwd, "~/some_dir/src/test/", defaultContext)
    ).to.equal(`${defaultHome}/some_dir/src/test/`);
  });

  it("returns the entire search term if it is an absolute path relative to /", () => {
    expect(getCurrentInsertedDirectory(defaultCwd, "/etc/bin/tool", defaultContext)).to.equal(
      "/etc/bin/"
    );
  });

  it("returns the path with $HOME resolved", () => {
    expect(getCurrentInsertedDirectory(defaultCwd, "$HOME/src/test/", defaultContext)).to.equal(
      `${defaultHome}/src/test/`
    );
  });

  it("returns the path with $DIR resolved", () => {
    expect(
      getCurrentInsertedDirectory(
        defaultCwd,
        "$DIR/src/test/",
        defaultContextWithEnv({
          DIR: "/tmp/folder",
        })
      )
    ).to.equal("/tmp/folder/src/test/");
  });

  it("returns the path with $DIR and $HOME resolved", () => {
    expect(
      getCurrentInsertedDirectory(
        defaultCwd,
        "$HOME/src/$DIR/test/",
        defaultContextWithEnv({
          DIR: "tmp/folder",
        })
      )
    ).to.equal(`${defaultHome}/src/tmp/folder/test/`);
  });

  it("returns the path when just $HOME is specified", () => {
    expect(getCurrentInsertedDirectory(defaultHome, "$HOME", defaultContext)).to.equal("/home/");
  });

  it("returns the path when $DIR is not specified", () => {
    expect(getCurrentInsertedDirectory(defaultCwd, "$DIR", defaultContext)).to.equal(
      `${defaultCwd}/`
    );
  });

  it("returns the path with the complex $DIR and $HOME resolved", () => {
    expect(
      getCurrentInsertedDirectory(
        defaultCwd,
        // eslint-disable-next-line no-template-curly-in-string
        "${HOME}/src/${DIR}/test/",
        defaultContextWithEnv({
          DIR: "tmp/folder",
        })
      )
    ).to.equal(`${defaultHome}/src/tmp/folder/test/`);
  });

  it("returns the path with the complex $DIR and $HOME resolved with default", () => {
    expect(
      getCurrentInsertedDirectory(
        defaultCwd,
        // eslint-disable-next-line no-template-curly-in-string
        "${HOME:-/fallback}/src/${DIR:-fallback}/test/",
        defaultContext
      )
    ).to.equal(`${defaultHome}/src/fallback/test/`);
  });
});

describe("Test sortFilesAlphabetically", () => {
  const files = ["a", "e", "z", "t", "m", "b", "x"];

  it("should sort files alphabetically", () => {
    expect(sortFilesAlphabetically(files)).to.eql(["a", "b", "e", "m", "t", "x", "z", "../"]);
  });

  it("should sort files alphabetically and put dotfiles/folders at the end", () => {
    expect(sortFilesAlphabetically([...files, ".g", ".l"])).to.eql([
      "a",
      "b",
      "e",
      "m",
      "t",
      "x",
      "z",
      ".g",
      ".l",
      "../",
    ]);
  });

  it("should sort files alphabetically and skip files in the skip array", () => {
    expect(sortFilesAlphabetically(files, ["b", "t"])).to.eql(["a", "e", "m", "x", "z", "../"]);
  });
});

// describe("Test filepaths generators", () => {
//   let currentCWD: string;
//   let executeCommandStub: sinon.SinonStub;

//   async function executeCommand(args: Fig.ExecuteCommandInput): Promise<Fig.ExecuteCommandOutput> {
//     try {
//       return executeCommandStub(args);
//     } catch (err) {
//       return new Promise((resolve) => {
//         resolve({
//           stdout: "",
//           stderr: "",
//           status: 1,
//         });
//       });
//     }
//   }

//   async function runFilepaths(
//     options: FilepathsOptions,
//     mockLSResults: string[],
//     context = defaultContext
//   ): Promise<string[]> {
//     executeCommandStub.resolves(mockLSResults.join("\n"));
//     return (await filepaths(options).custom!([], executeCommand, context)).map(toName);
//   }

//   beforeEach(() => {
//     executeCommandStub = sinon.stub();
//     // these steps are approximately the ones performed by the engine before running a generator
//     currentCWD = "~/current_cwd/";
//     defaultContext.currentWorkingDirectory = currentCWD;
//   });

//   afterEach(() => {
//     executeCommandStub.resetHistory();
//   });

//   after(() => {
//     sinon.reset();
//   });

//   describe("filepaths generator", () => {
//     describe("should trigger correctly", () => {
//       const test = testTrigger(filepaths);
//       test("", "", false);
//       test("", "a", false);
//       test("a", "aa", false);
//       test("aa", "aa", false);
//       test("a", "a/", true);
//       test("a/a", "a/ab", false);
//       test("a/ab", "a/abc", false);
//       test("a/ab", "/ab", true);
//       test("bar/ab", "foo/ab", true);
//     });

//     describe("should return the correct query term", () => {
//       const test = testQueryTerm(filepaths);
//       test("", "");
//       test("a", "a");
//       test("abc", "abc");
//       test("abc/", "");
//       test("abc/d", "d");
//       test("~/abc", "abc");
//       test("/abc", "abc");
//     });

//     describe("should return filepaths suggestions", () => {
//       const suggestions = ["a/", "c/", "l", "x"];
//       it("should show all suggestions when no options or search term is specified", async () => {
//         executeCommandStub.resolves(suggestions.join("\n"));
//         expect(await filepaths.custom!([], executeCommand, defaultContext)).to.eql(
//           [
//             { insertValue: "a/", name: "a/", type: "folder", context: { templateType: "folders" } },
//             { insertValue: "c/", name: "c/", type: "folder", context: { templateType: "folders" } },
//             { insertValue: "l", name: "l", type: "file", context: { templateType: "filepaths" } },
//             { insertValue: "x", name: "x", type: "file", context: { templateType: "filepaths" } },
//             {
//               insertValue: "../",
//               name: "../",
//               type: "folder",
//               context: { templateType: "folders" },
//             },
//           ].map((x) => ({ ...x, isDangerous: undefined }))
//         );
//       });
//       it("should call executeCommand with specified user input dir", async () => {
//         const results = await runFilepaths({ rootDirectory: "/etc/" }, suggestions);
//         expect(executeCommand).to.have.been.calledWith(
//           "cd /etc/ && command ls -1ApL | cat",
//           undefined
//         );
//         expect(results).to.eql(suggestions.concat("../"));
//       });

//       it("should call executeCommand with specified user input dir and updated relative search term", async () => {
//         const results = await runFilepaths({ rootDirectory: "/etc/" }, suggestions, {
//           ...defaultContext,
//           searchTerm: "bin/n",
//         });
//         expect(executeCommand).to.have.been.calledWith(
//           "cd /etc/bin/ && command ls -1ApL | cat",
//           undefined
//         );
//         expect(results).to.eql(suggestions.concat("../"));
//       });

//       it("should call executeCommand with specified user input dir and updated absolute search term", async () => {
//         const results = await runFilepaths({ rootDirectory: "/etc/" }, suggestions, {
//           ...defaultContext,
//           searchTerm: "/etc/bin/pin",
//         });

//         expect(executeCommand).to.have.been.calledWith(
//           "cd /etc/bin/ && command ls -1ApL | cat",
//           undefined
//         );
//         expect(results).to.eql(suggestions.concat("../"));
//       });
//     });

//     describe("should apply options correctly when they are specified", () => {
//       it("should suggest files containing a single-dotted extension", async () => {
//         const options: FilepathsOptions = {
//           extensions: ["js", "mjs"],
//         };
//         const passing: string[] = [
//           "file1.test.js",
//           "file2.js",
//           "file3.mjs",
//           "folder1.txt/",
//           "folder2.txt/",
//           "folder3/",
//         ];
//         const failing: string[] = ["file4.ts"];
//         const results = await runFilepaths(options, passing.concat(failing));
//         expect(executeCommand).to.have.been.calledWith(
//           "cd ~/current_cwd/ && command ls -1ApL | cat",
//           undefined
//         );
//         expect(results).to.eql(passing.concat("../"));
//       });

//       it("should suggest files containing extensions with multiple dots", async () => {
//         const options: FilepathsOptions = {
//           extensions: ["test.js", "test.ts"],
//         };
//         const passing: string[] = [
//           "file.detail.test.js",
//           "file1.test.js",
//           "file2.test.ts",
//           "folder1.txt/",
//           "folder2.txt/",
//           "folder3/",
//         ];
//         const failing: string[] = ["file.js", "file3.test.mjs", "file4.test.mts"];
//         const results = await runFilepaths(options, passing.concat(failing));
//         expect(results).to.eql(passing.concat("../"));
//       });

//       describe("showFolders option", () => {
//         it("it should always suggest folders when no `showFolders` option is provided", async () => {
//           const options: FilepathsOptions = {};
//           const passing: string[] = [
//             "file1.test.js",
//             "file2.js",
//             "file3.mjs",
//             "file4.ts",
//             "folder1.txt/",
//             "folder2.txt/",
//             "folder3/",
//           ];
//           const results = await runFilepaths(options, passing);
//           expect(results).to.eql(passing.concat("../"));
//         });

//         it("it should not suggest folders when `showFolders` is 'never'", async () => {
//           const options: FilepathsOptions = {
//             showFolders: "never",
//           };
//           const passing: string[] = ["file1.test.js", "file2.js", "file3.mjs", "file4.ts"];
//           const failing: string[] = ["folder1.txt/", "folder2.txt/", "folder3/"];
//           const results = await runFilepaths(options, passing.concat(failing));
//           // NOTE: results won't have `../`
//           expect(results).to.eql(passing);
//         });

//         it("it should suggest only folders when `showFolders` is 'only'", async () => {
//           const options: FilepathsOptions = {
//             showFolders: "only",
//           };
//           const passing: string[] = ["folder1.txt/", "folder2.txt/", "folder3/"];
//           const failing: string[] = ["file1.test.js", "file2.js", "file3.mjs", "file4.ts"];
//           const results = await runFilepaths(options, passing.concat(failing));
//           expect(results).to.eql(passing.concat("../"));
//         });
//       });

//       it("it should filter folders as if they were custom files when `filterFolders` is `true`", async () => {
//         const options: FilepathsOptions = {
//           filterFolders: true,
//           equals: ["package.json", "a-folder/"],
//           matches: /foo/g,
//         };
//         const passing: string[] = ["a-folder/", "foo.js", "foo/", "package.json"];
//         const failing: string[] = ["bar.js", "a-folder.js", "some-other-folder/"];
//         const results = await runFilepaths(options, passing.concat(failing));
//         expect(results).to.eql(passing);
//       });

//       it("it should work correctly with 'matches'", async () => {
//         const options: FilepathsOptions = {
//           matches: /(file){1,2}\..*/g,
//         };
//         const passing: string[] = ["file.mjs", "file1/", "filefile.js", "filefile.txt/"];
//         const failing: string[] = ["file1.js"];
//         const results = await runFilepaths(options, passing.concat(failing));
//         expect(results).to.eql(passing.concat("../"));
//       });

//       it("it should work correctly with 'equals'", async () => {
//         const options: FilepathsOptions = {
//           equals: ["foo.js", "bar.ts"],
//         };
//         const passing: string[] = ["bar.ts", "bar.ts/", "folder/", "foo.js", "foo.js/", "foo.ts/"];
//         const failing: string[] = ["foo.ts", "foo.js.ts"];
//         const results = await runFilepaths(options, passing.concat(failing));
//         expect(results).to.eql(passing.concat("../"));
//       });
//     });

//     it("it should sort suggestions returned form the `ls` command executed", async () => {
//       const options: FilepathsOptions = {};
//       const passing: string[] = ["c/", "b/", "a/"];
//       const expected: string[] = ["a/", "b/", "c/"];
//       const results = await runFilepaths(options, passing);
//       expect(results).to.eql(expected.concat("../"));
//     });

//     describe("deprecated sshPrefix", () => {
//       it("should call executeCommand with default user input dir ignoring ssh", async () => {
//         await filepaths.custom!([], executeCommand, {
//           ...defaultContext,
//           sshPrefix: "ssh -i blabla",
//         });

//         expect(executeCommand).to.have.been.calledWith(
//           "cd ~/current_cwd/ && command ls -1ApL | cat",
//           undefined
//         );
//       });
//     });
//   });

//   describe("folders generator", () => {
//     it("should suggest only folders and no filepaths", async () => {
//       const passing: string[] = ["folder1.txt/", "folder2.txt/", "folder3/"];
//       const failing: string[] = ["file1.test.js", "file2.js", "file3.mjs", "file4.ts"];

//       executeCommandStub.resolves(passing.concat(failing).join("\n"));
//       const results = (await folders().custom!([], executeCommand, defaultContext)).map(toName);

//       expect(results).to.eql(passing.concat("../"));
//     });
//   });
// });
