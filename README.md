<p align="center">
<a href="http://juanmard.github.io/icestudio"><img src="https://raw.githubusercontent.com/juanmard/icestudio/develop/docs/resources/images/logo/icestudio-logo-label.png" align="center"></a>
</p>

<p align="center">
  <a title="juanmard.github.io/icestudio" href="https://juanmard.github.io/icestudio"><img src="https://img.shields.io/website.svg?label=juanmard.github.io%2Ficestudio&longCache=true&style=flat-square&url=http%3A%2F%2Fjuanmard.github.io%2Ficestudio%2Findex.html&logo=github"></a><!--
  -->
  <a title="'icestudio' workflow status" href="https://github.com/juanmard/icestudio/actions?query=workflow%3Aicestudio"><img alt="'icestudio' workflow status" src="https://img.shields.io/github/workflow/status/juanmard/icestudio/icestudio?longCache=true&style=flat-square&label=icestudio&logo=github"></a><!--
  -->
  <a title="DevDependency Status" href="https://david-dm.org/juanmard/icestudio/moon?type=dev"><img src="https://img.shields.io/david/dev/juanmard/icestudio.svg?longCache=true&style=flat-square&label=devdeps&logo=npm"></a><!--
  -->
  <a title="Dependency Status" href="https://david-dm.org/juanmard/icestudio/moon?path=app"><img src="https://img.shields.io/david/juanmard/icestudio.svg?path=app&longCache=true&style=flat-square&label=app%20deps&logo=npm"></a>
</p>

Visual editor for Verilog designs, built on top of [Icestorm](http://www.clifford.at/icestorm/) and [Apio](https://github.com/FPGAwars/apio). For more information visit [juanmard.github.io/icestudio](https://juanmard.github.io/icestudio).

# Installation

Requirements:

- GNU/Linux: `xclip`.
- macOS: [Homebrew](https://brew.sh).

Since this repository is a proof of concept, no regular/tagged releases are available yet. However, after each commit is pushed, CI workflows produce nightly builds for all the supported platforms. Users can pick the artifacts from pre-release [nightly](https://github.com/juanmard/icestudio/releases/tag/nightly) or from any of the successful jobs in [juanmard/icestudio/actions?query=workflow:icestudio](https://github.com/juanmard/icestudio/actions?query=workflow%3Aicestudio).

Check the [Documentation](https://juanmard.github.io/icestudio) for more information.

# Development

Install [Python >= 3.5](https://www.python.org/downloads/) and [Node.js](https://nodejs.org/). On Windows, the recommended Node.js version is `10.17.x`.

Install dependencies and start development:

```bash
yarn install
yarn start
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

`*.po` sources for localisation are located in [`app/resources/locale`](./app/resources/locale). For contributing, add or update the [app translations](https://github.com/juanmard/icestudio/tree/develop/app/resources/locale) using **[Poedit](https://poedit.net/)**.

## Package for distribution

```bash
yarn dist
```

- GNU/Linux: (linux32,linux64).zip, (linux32,linux64).AppImage
- Windows: (win32,win64).zip
- Mac OS: osx64.zip, osx64.dmg

## Apio configuration

Apio backend is configured in the `app/package.json` file:

- `apio.min`: minimum version (>=)
- `apio.max`: maximum version (<)
- `apio.extras`: list of external Python programmers (*blackiceprog*, *tinyfpgab*)
- `apio.external`: load an external Apio package instead of the default one (e.g. */path/to/my/apio*)
- `apio.branch`: install Apio from the repository branch instead of PyPI.

An external Apio package can be also set on runtime using the `ICESTUDIO_APIO` environment variable.
