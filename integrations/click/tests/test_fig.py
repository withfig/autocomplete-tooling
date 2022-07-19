from importlib.metadata import requires
import pytest
from click_complete_fig import fig
import click
  
### Fixtures
@pytest.fixture
def grouped_spec():
    return '''
// Autogenerated by click_complete_fig
const completionSpec: Fig.Spec = {
  "name": "fig",
  "options": [
    {
      "name": [
        "-r",
        "--root-option"
      ],
      "description": "Root option"
    },
    {
      "name": [
        "--help"
      ],
      "description": "Show this message and exit."
    }
  ],
  "args": [
    {
      "name": "choice",
      "suggestions": [
        "A",
        "B"
      ]
    }
  ],
  "subcommands": [
    {
      "name": "command",
      "description": "Debug fig",
      "deprecated": true,
      "hidden": true,
      "options": [
        {
          "name": [
            "--help"
          ],
          "description": "Show this message and exit."
        }
      ]
    },
    {
      "name": "command-with-args",
      "options": [
        {
          "name": [
            "--help"
          ],
          "description": "Show this message and exit."
        }
      ],
      "args": [
        {
          "name": "text",
          "isVariadic": true
        },
        {
          "name": "text"
        },
        {
          "name": "text"
        },
        {
          "name": "filename",
          "template": "filepaths"
        },
        {
          "name": "text"
        },
        {
          "name": "integer"
        },
        {
          "name": "path",
          "template": [
            "folders",
            "filepaths"
          ],
          "suggestCurrentToken": true
        },
        {
          "name": "path",
          "template": [
            "folders",
            "filepaths"
          ]
        }
      ]
    },
    {
      "name": "command-with-options",
      "options": [
        {
          "name": [
            "-s",
            "--string-to-echo"
          ],
          "args": [
            {
              "name": "text"
            }
          ]
        },
        {
          "name": [
            "--multiple"
          ],
          "isRepeatable": true
        },
        {
          "name": [
            "-r"
          ],
          "description": "Deprecated and required option",
          "isRequired": true
        },
        {
          "name": [
            "-c"
          ],
          "args": [
            {
              "name": "choice",
              "suggestions": [
                "A",
                "B"
              ]
            }
          ]
        },
        {
          "name": [
            "--arg-repeatable"
          ],
          "args": [
            {
              "name": "text"
            },
            {
              "name": "text"
            }
          ]
        },
        {
          "name": [
            "--shout"
          ],
          "exclusiveOn": [
            "--no-shout"
          ]
        },
        {
          "name": [
            "--no-shout"
          ],
          "exclusiveOn": [
            "--shout"
          ]
        },
        {
          "name": [
            "--help"
          ],
          "description": "Show this message and exit."
        }
      ]
    },
    {
      "name": "nested-command",
      "description": "Nested",
      "options": [
        {
          "name": [
            "--help"
          ],
          "description": "Show this message and exit."
        }
      ],
      "subcommands": [
        {
          "name": "double-nested-command",
          "description": "Double nested command",
          "options": [
            {
              "name": [
                "--help"
              ],
              "description": "Show this message and exit."
            }
          ],
          "args": [
            {
              "name": "text"
            }
          ]
        }
      ]
    }
  ]
}

export default completionSpec;
'''

@pytest.fixture
def non_grouped_cli_spec():
  return '''
// Autogenerated by click_complete_fig
const completionSpec: Fig.Spec = {
  "name": "non-grouped-cli",
  "description": "Simple program that greets NAME for a total of COUNT times.",
  "options": [
    {
      "name": [
        "--count"
      ],
      "description": "Number of greetings.",
      "args": [
        {
          "name": "integer"
        }
      ]
    },
    {
      "name": [
        "--name"
      ],
      "description": "The person to greet.",
      "args": [
        {
          "name": "text"
        }
      ]
    },
    {
      "name": [
        "--help"
      ],
      "description": "Show this message and exit."
    }
  ]
}

export default completionSpec;
'''


@pytest.fixture
def add_completion_spec_command_to_non_grouped_cli_thrown_error():
  return """
Cannot add the completion spec command to an object which is not a `click.Group` instance.
- If you are tring to add the command to a `click.Command` instance use `generate_completion_spec` 
  or convert `click.Command` to a `click.Group` instance.
- Useful links: https://click.palletsprojects.com/en/8.0.x/commands/#commands-and-groups
"""
### CLI Definitions

#### Grouped Spec
@click.group("fig")
@click.option('-r', '--root-option', help="Root option", is_flag=True)
@click.argument("choices", type=click.Choice(['A', 'B']))
def grouped_cli():
    pass

@grouped_cli.command("command", help="Debug fig", short_help="Debug", deprecated=True, hidden=True)
def cmd():
    pass

@grouped_cli.group("nested-command", short_help="Nested")
def nested_command():
    pass

@nested_command.command("double-nested-command", help="Double nested command")
@click.argument("string")
def double_nested_command():
    pass

@grouped_cli.command("command-with-options")
@click.option('-s', '--string-to-echo')
@click.option('--multiple', multiple=True, is_flag=True)
@click.option('-r', required=True, help="Deprecated and required option", is_flag=True)
@click.option('-c', type=click.Choice(['A', 'B']))
@click.option('--arg-repeatable', nargs=2)
@click.option('--shout/--no-shout', default=False)
def command_with_options():
    pass

@grouped_cli.command("command-with-args")
@click.argument('string', nargs=-1)
@click.argument('int', nargs=2)
@click.argument('filename', type=click.File())
@click.argument('filename', type=click.Tuple([str, int]))
@click.argument('filename', type=click.Path(dir_okay=True, file_okay=True))
@click.argument('filename', type=click.Path(dir_okay=True, file_okay=True, exists=True))
def command_with_args():
    pass

#### Non grouped Spec
@click.command()
@click.option('--count', default=1, help='Number of greetings.')
@click.option('--name', prompt='Your name',
              help='The person to greet.')
def non_grouped_cli(count, name):
    """Simple program that greets NAME for a total of COUNT times."""
    for x in range(count):
        click.echo(f"Hello {name}!")

### Test cases
def test_grouped_cli_generate(grouped_spec):
    assert fig.generate_completion_spec(grouped_cli) == grouped_spec

def test_non_grouped_cli_generate(non_grouped_cli_spec):
    assert fig.generate_completion_spec(non_grouped_cli) == non_grouped_cli_spec

def test_add_completion_spec_command_to_grouped_cli():
    try:
        fig.add_completion_spec_command(grouped_cli)
    except:
        assert False, f"An exception was raised"

def test_add_completion_spec_command_to_non_grouped_cli(
  add_completion_spec_command_to_non_grouped_cli_thrown_error
):
    with pytest.raises(SystemExit) as err:
        fig.add_completion_spec_command(non_grouped_cli)
    assert str(err.value) == add_completion_spec_command_to_non_grouped_cli_thrown_error
    

