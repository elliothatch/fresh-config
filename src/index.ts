import * as fs from 'fs';
import * as Minimist from 'minimist';
import * as Path from 'path';

export class InvalidConfigurationError extends Error {
    public configPath: string;
    public innerError: Error;
    constructor(message: string, data: {configPath: string, innerError: Error}) {
        super(message);
        Object.setPrototypeOf(this, InvalidConfigurationError.prototype);

        this.configPath = data.configPath;
        this.innerError = data.innerError;
    }
}

export class Configuration {
    public sources: object[];
    /**
     * @param path default path to the configuration file if none provided in command line args.
     * @param args command line arguments
     */
    constructor(file?: string, args = process.argv.slice(2)) {
        const commandLine = Minimist(process.argv.slice(2));
        this.sources = [commandLine];

        const configFile = (commandLine.config && typeof commandLine.config === 'string') ? commandLine.config : file;
        if(configFile) {
            this.sources = [loadFile(configFile), ...this.sources];
        }
    }
}

export function loadFile(path: string): any {
    try {
        const contents = fs.readFileSync(path);
        return JSON.parse(contents.toString());
    } catch(error) {
        throw new InvalidConfigurationError(`Failed to load config file`, {
            configPath: path,
            innerError: Error
        });
    };
}

/** make a new object and copy the listed properties from a set of objects. supports nested properties
 * @argument sources - input objects. values from earlier sources in the array can be overridden by later sources
 * @argument propertyNames - list of properties to copy. Nested properties are specified with dot notation ('a.b.c')
 */
export function copyProperties(sources: any[], propertyNames: string[]): any {
    const sourcesReversed = sources.slice().reverse();
    return propertyNames.reduce((out, pName) => {
        for(const source of sourcesReversed) {
            const value = getProperty(source, pName);
            if(value !== undefined) {
                setProperty(out, pName, value);
                break;
            }
        }
        return out;
    }, {});
}

/** sets a property on an object. Supports nested properties, creates nested objects when necessary
 * @argument obj - root object
 * @argument propertyName - name of the property to set. Nested properties are specified with dot notation ('a.b.c')
 * @argument value - the value to set. if undefined, do nothing and don't create nested objects
 */
export function setProperty(obj: any, propertyName: string, value: any): any {
    if(!obj) {
        return undefined;
    }

    const properties = propertyName.split('.');
    if(properties.length === 1) {
        obj[properties[0]] = value;
        return obj;
    }

    if(!obj[properties[0]]) {
        obj[properties[0]] = {};
    }
    return setProperty(obj[properties[0]], properties.slice(1).join('.'), value);
}


/** Gets a property from an object if it exists. Supports nested properties
 * @argument obj - root object
 * @argument propertyName - name of the property to retrieved. Nested properties are specified with dot notation ('a.b.c')
 */
export function getProperty(obj: any, propertyName: string): any {
    if(!obj) {
        return undefined;
    }

    const properties = propertyName.split('.');
    const value = obj[properties[0]];
    if(properties.length === 1) {
        return value;
    }

    return getProperty(value, properties.slice(1).join('.'));
}
