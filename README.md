<p align="center">
  <a title="'dev' workflow status" href="https://github.com/umarcor/hwstudio/actions?query=workflow%3Adev"><img alt="'dev' workflow status" src="https://img.shields.io/github/workflow/status/umarcor/hwstudio/dev?longCache=true&style=flat-square&label=dev&logo=github"></a><!--
  -->
  <a title="'icestudio' workflow status" href="https://github.com/umarcor/hwstudio/actions?query=workflow%3Aicestudio"><img alt="'icestudio' workflow status" src="https://img.shields.io/github/workflow/status/umarcor/hwstudio/icestudio?longCache=true&style=flat-square&label=icestudio&logo=github"></a>
</p>

<p align="center">
  <img width="550px" src="./app/resources/images/banner.png"/>
</p>

<p align="center">
  <a title="DevDependency Status" href="https://david-dm.org/umarcor/hwstudio/zdevelop?type=dev"><img src="https://img.shields.io/david/dev/umarcor/hwstudio.svg?longCache=true&style=flat-square&label=devdeps&logo=npm"></a><!--
  -->
  <a title="Dependency Status" href="https://david-dm.org/umarcor/hwstudio/zdevelop?path=app"><img src="https://img.shields.io/david/umarcor/hwstudio.svg?path=app&longCache=true&style=flat-square&label=deps&logo=npm"></a><!--
  -->
</p>

# Installation

Requirements:

- GNU/Linux: `xclip`.
- macOS: [Homebrew](https://brew.sh).

Since this repository is a proof of concept, no regular/tagged releases are available yet. However, after each commit is pushed, CI workflows produce nightly builds for all the supported platforms. Users can pick the artifacts from pre-release [icestudio-nightly](https://github.com/umarcor/hwstudio/releases/tag/icestudio-nightly) or from any of the successful jobs in [umarcor/hwstudio/actions?query=workflow%3Apush](https://github.com/umarcor/hwstudio/actions?query=workflow%3Apush).

Check the [Documentation](https://juanmard.github.io/icestudio) for more information.

# Development

Requires `10 <=` [Node.js](https://nodejs.org/) `<= 11`.

Use `yarn` (or `npm`) to install dependencies to subdir `node_modules`.

```sh
yarn install
```

## Docker images for development

```sh
./docker -d
./docker -t bash
```

> NOTE: for adding blocks or examples, you can contribute to [icestudio-blocks](https://github.com/FPGAwars/icestudio-blocks), [icestudio-examples](https://github.com/FPGAwars/icestudio-examples) or [collection-default](https://github.com/FPGAwars/collection-default).

## Build the docs

```bash
cd docs
pip3 install -r requirements.txt
make html
firefox _build/html/index.html
```

## Internationalisation

Use `yarn gettext` to extract the labels from the code.

## Localisation

Basque, Catalan, Chinese, Czech, Dutch, English, French, Galician, German, Greek, Italian, Korean, Russian, Spanish...

`*.po` sources for localisation are located in [`app/resources/locale`](./app/resources/locale).

## Package for distribution

```bash
yarn dist
```

- GNU/Linux: (linux32,linux64).zip, (linux32,linux64).AppImage
- Windows: (win32,win64).zip
- Mac OS: osx64.zip, osx64.dmg
