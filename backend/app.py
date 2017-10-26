from flask import Flask
from flask import url_for, send_from_directory, request

import json
from sklearn.decomposition import KernelPCA
from sklearn.manifold import TSNE

import numpy as np


app = Flask(__name__)#static_url_path=''
staticPath = '../build'
#staticPath = 'testpage'

@app.route("/")
def index():
    return url_for('index.html')


@app.route("/<path:path>")
def all(path):
    print path
    return send_from_directory(staticPath, path)


@app.route("/dr", methods=['POST'])
def dr():
    K = request.get_json()
    K = np.array(K)
    x = computeDr(K)
    print x
    x = x.tolist()
    return json.dumps(x)


def computeDr(K):
    model = KernelPCA(n_components=2)
    x = model.fit_transform(K)
    #model = TSNE(n_components=2, perplexity=5)
    #x = model.fit_transform(1-K)
    return x

         
if __name__ == '__main__':
    app.run(debug=True)
