// Autogenerated by @fig/complete-commander
const completionSpec: Fig.Spec = {
  name: "",
  options: [
    {
      name: ["-n", "--number"],
      description: "specify numbers",
      args: { name: "value", isVariadic: true, template: ["filepaths"] },
    },
    {
      name: ["-l", "--letter"],
      description: "specify letters",
      args: {
        name: "value",
        isOptional: true,
        isVariadic: true,
        suggestions: ["zoo", "baz"],
      },
    },
    {
      name: ["-h", "--help"],
      description: "display help for command",
      priority: 49,
    },
  ],
};
export default completionSpec;
