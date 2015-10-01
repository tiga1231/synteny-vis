#!/bin/bash

if ! npm run lint ; then
	exit 1
fi

if ! webpack -p ; then
	exit 1
fi

cp -r build/* gh-pages

cd gh-pages
git commit -a -m"gh-pages build"
git push
