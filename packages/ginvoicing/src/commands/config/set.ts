import chalk from 'chalk';
import * as lodash from 'lodash';

import { validators } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IBaseConfig, OptionGroup, PROJECT_FILE } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

export class ConfigSetCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'set',
      type: 'global',
      summary: 'Set config values',
      description: `
By default, this command sets JSON properties in your project's ${chalk.bold(PROJECT_FILE)} file.

The CLI sets properties in the CLI config file (${chalk.bold('~/.ginvoicing/config.json')}).

For nested properties, separate nest levels with dots. For example, the property name ${chalk.green('user.email')} will look in the ${chalk.bold('user')} object (a root-level field in the global CLI config file) for the ${chalk.bold('email')} field.

${chalk.green('ginvoicing config set')} will attempt to coerce ${chalk.green('value')} into a suitable JSON type. If it is JSON-parsable, such as ${chalk.green('true')} or ${chalk.green('[]')}, it takes the parsed result. Otherwise, the value is interpreted as a string. For stricter input, use ${chalk.green('--json')}, which will error with non-JSON values.

By default, if ${chalk.green('property')} exists and is an object or an array, the value is not overwritten. To disable this check and always overwrite the property, use ${chalk.green('--force')}.
      `,
      inputs: [
        {
          name: 'property',
          summary: 'The property name you wish to set',
          validators: [validators.required],
        },
        {
          name: 'value',
          summary: 'The new value of the given property',
          validators: [validators.required],
        },
      ],
      options: [
        {
          name: 'json',
          summary: `Always interpret ${chalk.green('value')} as JSON`,
          type: Boolean,
          aliases: ['j'],
        },
        {
          name: 'force',
          summary: 'Always overwrite existing values',
          type: Boolean,
          groups: [OptionGroup.Advanced],
        },
      ],
      exampleCommands: ['name newAppName', 'name "\\"newAppName\\"" --json'],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ p ] = inputs;
    let [ , v ] = inputs;

    const { json, force } = options;

    const file: IBaseConfig<object> = this.env.config;

    const config = await file.load();
    const oldValue = lodash.get(config, p);

    if (!v.match(/^\d+e\d+$/)) {
      try {
        v = JSON.parse(v);
      } catch (e) {
        if (!(e instanceof SyntaxError)) {
          throw e;
        }

        if (json) {
          throw new FatalException(`${chalk.green('--json')}: ${chalk.green(v)} is invalid JSON: ${chalk.red(String(e))}`);
        }
      }
    }

    const newValue = v;

    if (oldValue && typeof oldValue === 'object' && !force) {
      throw new FatalException(
        `Sorry--will not override objects or arrays without ${chalk.green('--force')}.\n` +
        `Value of ${chalk.green(p)} is: ${chalk.bold(JSON.stringify(oldValue))}`
      );
    }

    const valueChanged = oldValue !== newValue;

    lodash.set(config, p, newValue);
    await file.save();

    if (valueChanged) {
      this.env.log.ok(`${chalk.green(p)} set to ${chalk.green(JSON.stringify(v))} in ${chalk.bold(prettyPath(file.filePath))}!`);
    } else {
      this.env.log.msg(`${chalk.green(p)} is already set to ${chalk.bold(JSON.stringify(v))}.`);
    }
  }
}
