# filednd

Files Drag and Drop

## Features

* Support for multiple files 
* Support folder
* Support toTree(Data structure of tree)

## Demo

[filednd](https://deyihu.github.io/filednd/test/index.html)

## Install

### NPM

```sh
 npm i filednd
#  or
yarn add filednd 
```

### CDN 

```html
<script src="https://unpkg.com/filednd/dist/filednd.js"></script>
```

### API

## FileDND 

### constructor(ele)

* ele : HTMLElement

```js
import {
    FileDND
} from 'filednd';
const fdnd = new FileDND(document.querySelector('#zone'));

// if you use cdn 
// const fdnd = new filednd.FileDND(document.querySelector('#zone'));
```

### methods

* dnd(callback) `listen htmlelement drag and drop`

```js
fdnd.dnd((files) => {
    console.log(files);
});
```

* toTree(callback) `Convert file collection structure to tree data structure`

```js
  const treeData = fdnd.toTree();
```

* clear() `clear all files`

```js
 fdnd.clear();
```

* dispose() ``

```js
 fdnd.dispose();
```
