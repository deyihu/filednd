
import mitt from 'mitt';

function dragEvent(event) {
    event.stopPropagation();
    event.preventDefault();
}
const DRAGEVENTS = ['dragstart', 'dragenter', 'dragend', 'dragleave', 'dragover'];

let uid = 0;

const uuid = () => {
    uid++;
    return uid;
};

function mergeArray(array1, array2) {
    for (let i = 0, len = array2.length; i < len; i++) {
        array1.push(array2[i]);
    }
    return array1;
}

function setFilePath(fileEntry, parentFileEntry) {
    const folder = parentFileEntry ? parentFileEntry.path : '/';
    if (fileEntry.isFile) {
        fileEntry.path = `${folder}${fileEntry.name}`;
    } else if (fileEntry.isDirectory) {
        fileEntry.path = `${folder}${fileEntry.name}/`;
    }
}

function readFileItems(fileItems, callback) {
    let dirs = [];
    const files = [];
    for (let i = 0, len = fileItems.length; i < len; i++) {
        const item = fileItems[i];
        const fileEntry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : item;
        fileEntry.id = uuid();
        files.push(fileEntry);
        if (fileEntry.isDirectory) {
            dirs.push(fileEntry);
        }
        setFilePath(fileEntry);
    }
    let fileEntryList = [], isReading = false, idx = 0;
    const readFiles = () => {
        idx = 0;
        const readFile = () => {
            if (idx < files.length) {
                const fileEntry = files[idx];
                if (fileEntry.isDirectory) {
                    idx++;
                    readFile();
                } else {
                    fileEntry.file((file) => {
                        file.path = fileEntry.path || '/';
                        file.parentName = fileEntry.parentName;
                        file.id = fileEntry.id;
                        file.pid = fileEntry.pid;
                        file.isDirectory = !!file.isDirectory;
                        files[idx] = file;
                        idx++;
                        readFile();
                    });
                }
            } else {
                callback(files);
            }
        };
        readFile();
    };

    const read = () => {
        if (idx < dirs.length) {
            const dirEntry = dirs[idx];
            const dirRender = dirEntry.createReader();
            const readDir = () => {
                dirRender.readEntries((results) => {
                    if (results.length) {
                        results.forEach(fileEntry => {
                            fileEntry.id = uuid();
                            fileEntry.pid = dirEntry.id;
                            fileEntry.parentName = dirEntry.name;
                            setFilePath(fileEntry, dirEntry);
                        });
                        mergeArray(fileEntryList, results);
                        readDir();
                    } else {
                        idx++;
                        read();
                    }
                });
            };
            readDir();
        } else {
            const tempDirs = [];
            fileEntryList.forEach(fileEntry => {
                files.push(fileEntry);
                if (fileEntry.isDirectory) {
                    tempDirs.push(fileEntry);
                }
            });
            dirs = tempDirs;
            isReading = false;
        }
    };

    const id = setInterval(() => {
        if (dirs.length === 0) {
            clearInterval(id);
            readFiles();
        } else if (!isReading) {
            isReading = true;
            fileEntryList = [];
            idx = 0;
            read();
        }
    }, 1);
}

export class FileDND {
    constructor(ele) {
        if (!ele || !(ele instanceof HTMLElement)) {
            console.error('ele is error,It should be HTMLElement instance');
            return;
        }
        this.ele = ele;
        this.files = [];
        this._bindEvents = false;
        this.emitter = mitt();
    }

    dnd(callback) {
        if (!this.ele) {
            console.error('not find ele');
            return;
        }
        if (!callback) {
            console.error('callback is null');
            return;
        }
        if (!this._bindEvents) {
            DRAGEVENTS.forEach(eventName => {
                this.ele.addEventListener(eventName, dragEvent);
            });
            const dropEvent = (event) => {
                event.stopPropagation();
                event.preventDefault();
                const df = event.dataTransfer;
                const items = df.items;
                this.emitter.emit('readstart', this);
                readFileItems(items, (files) => {
                    const callback = this.dndBackCall.bind(this);
                    this.files = files;
                    callback(files.filter(file => {
                        return file instanceof File;
                    }));
                    this.emitter.emit('readend', this);
                });
            };
            this.dropEvent = dropEvent;
            this._bindEvents = true;
            this.ele.addEventListener('drop', dropEvent);
        }
        this.dndBackCall = callback;
    }

    dispose() {
        if (this._bindEvents) {
            DRAGEVENTS.forEach(eventName => {
                this.ele.removeEventListener(eventName, dragEvent);
            });
            this.ele.removeEventListener('drop', this.dropEvent);
        }
        this.ele = null;
        this.files = null;
        this.emitter.all.clear();
        return this;
    }

    toTree() {
        const files = this.files;
        const fileMap = {};
        files.forEach(file => {
            const { id, path, name, parentName } = file;
            if (!fileMap[id]) {
                fileMap[id] = {
                    id,
                    name,
                    label: name,
                    path,
                    parentName: parentName,
                    children: [],
                    isDirectory: file.isDirectory
                };
            }
        });
        files.forEach(file => {
            const { pid, id } = file;
            if (fileMap[pid]) {
                fileMap[pid].children.push(fileMap[id]);
            }
        });
        // sort children Folder first, file later
        for (const id in fileMap) {
            const children = fileMap[id].children;
            const dirs = [], files = [];
            children.forEach(child => {
                if (child.isDirectory) {
                    dirs.push(child);
                } else {
                    files.push(child);
                }
            });
            fileMap[id].children = mergeArray(dirs, files);
        }
        return Object.values(fileMap).filter(d => {
            return !d.parentName;
        });

    }

    toFolderTree() {
        const nodes = this.toTree() || [];
        let text = '';
        const loopNode = (node, level = 1) => {
            const { name } = node;
            let prefix = '├─ ';
            if (level > 1) {
                const array = [];
                while (array.length < level - 1) {
                    array.push('| ');
                }
                prefix = array.join('').toString() + prefix;
            }
            text += `${prefix}${name} \n`;
            const children = node.children;
            if (children && children.length) {
                level++;
                children.forEach(child => {
                    loopNode(child, level);
                });
            }
        };
        return nodes.map(node => {
            text = '';
            loopNode(node);
            return text;
        }).join('').toString();
    }

    clear() {
        this.files = [];
        return this;
    }

    on(eventName, handler) {
        this.emitter.on(eventName, handler);
        return this;
    }

    off(eventName, handler) {
        this.emitter.off(eventName, handler);
        return this;
    }
}
