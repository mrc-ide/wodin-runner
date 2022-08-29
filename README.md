## odin JavaScript support

[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)
[![build-and-test](https://github.com/mrc-ide/odin-js/actions/workflows/ci.yml/badge.svg)](https://github.com/mrc-ide/odin-js/actions/workflows/ci.yml)
[![codecov.io](https://codecov.io/github/mrc-ide/odin-js/coverage.svg?branch=main)](https://codecov.io/github/mrc-ide/odin-js?branch=main)

Support for running [odin](https://mrc-ide.github.io/odin) models from JavaScript - this is used by odin itself for running models via [V8](https://github.com/jeroen/v8) and by [wodin](https://github.com/mrc-ide/wodin), the web interface.

We make a distinction between two basic types of models:

* continuous time models (ODE and DDE) for which we are primarily interested in a single solution over time
* discrete time (typically stochastic) models where we are interested in the behaviour of individual realisations, but also of summary statistics of these realisations such as the mean

## Licence

MIT © Imperial College of Science, Technology and Medicine

Please note that this project is released with a [Contributor Code of Conduct](CONDUCT.md). By participating in this project you agree to abide by its terms.
