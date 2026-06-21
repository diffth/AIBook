/**
 * Custom Browser-Side Machine Learning Library (ml.js)
 * Implements Decision Tree, Random Forest, and GBDT (XGBoost representation)
 * 100% Client-Side JS with Zero Dependencies.
 */

// Helper functions for machine learning math
const MLMath = {
  // Gini Impurity for Classification
  gini(labels) {
    const n = labels.length;
    if (n === 0) return 0;
    const counts = {};
    for (const label of labels) {
      counts[label] = (counts[label] || 0) + 1;
    }
    let sumSq = 0;
    for (const key in counts) {
      const p = counts[key] / n;
      sumSq += p * p;
    }
    return 1 - sumSq;
  },

  // Mean Squared Error for Regression
  mse(values) {
    const n = values.length;
    if (n === 0) return 0;
    let sum = 0;
    for (const v of values) sum += v;
    const mean = sum / n;
    let sumSqErr = 0;
    for (const v of values) {
      const err = v - mean;
      sumSqErr += err * err;
    }
    return sumSqErr / n;
  },

  // Log-odds sigmoid function
  sigmoid(x) {
    return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
  },

  // Log-odds function (logit)
  logit(p) {
    const epsilon = 1e-15;
    const clipped = Math.max(epsilon, Math.min(1 - epsilon, p));
    return Math.log(clipped / (1 - clipped));
  },

  // Bootstrap sampling helper (with replacement)
  bootstrap(X, y) {
    const n = X.length;
    const XSample = [];
    const ySample = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      XSample.push(X[idx]);
      ySample.push(y[idx]);
    }
    return { XSample, ySample };
  },

  // Shuffle array (for feature bagging)
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
};

// Node structure for Decision Tree
class DecisionTreeNode {
  constructor(config = {}) {
    this.feature = config.feature !== undefined ? config.feature : null;
    this.threshold = config.threshold !== undefined ? config.threshold : null;
    this.left = config.left !== undefined ? config.left : null;
    this.right = config.right !== undefined ? config.right : null;
    this.value = config.value !== undefined ? config.value : null; // For leaf: prediction value
    this.isLeaf = config.isLeaf || false;
    this.impurity = config.impurity !== undefined ? config.impurity : 0;
    this.samples = config.samples !== undefined ? config.samples : 0;
    this.splitType = config.splitType || null; // 'numeric' or 'categorical'
  }
}

// Decision Tree Base Class
class DecisionTree {
  constructor(config = {}) {
    this.maxDepth = config.maxDepth || 10;
    this.minSamplesSplit = config.minSamplesSplit || 2;
    this.isRegression = config.isRegression || false;
    this.maxFeatures = config.maxFeatures || null; // 'sqrt', 'log2', or float, or null
    this.root = null;
    this.features = [];
    this.featureImportances = {};
  }

  fit(X, y, features = null) {
    // X is an array of objects: [ { col1: val1, col2: val2 }, ... ]
    // y is an array of target values
    if (X.length === 0) return;
    this.features = features || Object.keys(X[0]);
    this.featureImportances = {};
    for (const f of this.features) {
      this.featureImportances[f] = 0;
    }

    const indices = Array.from({ length: X.length }, (_, i) => i);
    this.root = this._buildTree(X, y, indices, 0);
    this._normalizeFeatureImportances();
  }

  _buildTree(X, y, indices, depth) {
    const numSamples = indices.length;
    const subsetY = indices.map(i => y[i]);

    const impurity = this.isRegression ? MLMath.mse(subsetY) : MLMath.gini(subsetY);

    // Stop conditions
    const allSameLabel = this.isRegression ? (impurity === 0) : (new Set(subsetY).size === 1);
    if (
      depth >= this.maxDepth ||
      numSamples < this.minSamplesSplit ||
      allSameLabel ||
      impurity < 1e-7
    ) {
      return new DecisionTreeNode({
        isLeaf: true,
        value: this._calculateLeafValue(subsetY),
        impurity: impurity,
        samples: numSamples
      });
    }

    // Feature Bagging: select subset of features if configured
    let featuresToTry = [...this.features];
    if (this.maxFeatures) {
      let numFeats = featuresToTry.length;
      if (this.maxFeatures === 'sqrt') {
        numFeats = Math.max(1, Math.floor(Math.sqrt(featuresToTry.length)));
      } else if (this.maxFeatures === 'log2') {
        numFeats = Math.max(1, Math.floor(Math.log2(featuresToTry.length)));
      } else if (typeof this.maxFeatures === 'number') {
        numFeats = Math.max(1, Math.floor(featuresToTry.length * this.maxFeatures));
      }
      featuresToTry = MLMath.shuffle(featuresToTry).slice(0, numFeats);
    }

    // Find best split
    const split = this._getBestSplit(X, y, indices, featuresToTry, impurity);

    if (!split || split.gain <= 0) {
      return new DecisionTreeNode({
        isLeaf: true,
        value: this._calculateLeafValue(subsetY),
        impurity: impurity,
        samples: numSamples
      });
    }

    // Accumulate feature importance (weighted by sample fraction)
    const weight = numSamples / X.length;
    this.featureImportances[split.feature] += weight * split.gain;

    // Recursively build branches
    const leftNode = this._buildTree(X, y, split.leftIndices, depth + 1);
    const rightNode = this._buildTree(X, y, split.rightIndices, depth + 1);

    return new DecisionTreeNode({
      feature: split.feature,
      threshold: split.threshold,
      splitType: split.splitType,
      left: leftNode,
      right: rightNode,
      impurity: impurity,
      samples: numSamples
    });
  }

  _getBestSplit(X, y, indices, features, parentImpurity) {
    let bestGain = -1;
    let bestSplit = null;

    for (const feature of features) {
      const values = indices.map(i => X[i][feature]);
      const uniqueValues = Array.from(new Set(values));

      // Determine split type
      const isNumeric = uniqueValues.every(v => typeof v === 'number' || !isNaN(Number(v)));
      const splitType = isNumeric ? 'numeric' : 'categorical';

      let thresholds = [];
      if (isNumeric) {
        // Sort numerical values to find midpoints
        const sorted = uniqueValues.map(Number).sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 1; i++) {
          thresholds.push((sorted[i] + sorted[i+1]) / 2);
        }
      } else {
        thresholds = uniqueValues;
      }

      for (const threshold of thresholds) {
        const leftIndices = [];
        const rightIndices = [];

        for (const idx of indices) {
          const val = X[idx][feature];
          if (splitType === 'numeric') {
            if (Number(val) <= Number(threshold)) {
              leftIndices.push(idx);
            } else {
              rightIndices.push(idx);
            }
          } else {
            if (val === threshold) {
              leftIndices.push(idx);
            } else {
              rightIndices.push(idx);
            }
          }
        }

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftY = leftIndices.map(i => y[i]);
        const rightY = rightIndices.map(i => y[i]);

        const leftImp = this.isRegression ? MLMath.mse(leftY) : MLMath.gini(leftY);
        const rightImp = this.isRegression ? MLMath.mse(rightY) : MLMath.gini(rightY);

        const leftWeight = leftIndices.length / indices.length;
        const rightWeight = rightIndices.length / indices.length;

        const gain = parentImpurity - (leftWeight * leftImp + rightWeight * rightImp);

        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = {
            feature,
            threshold,
            splitType,
            leftIndices,
            rightIndices,
            gain
          };
        }
      }
    }

    return bestSplit;
  }

  _calculateLeafValue(y) {
    if (y.length === 0) return 0;
    if (this.isRegression) {
      // Mean for regression
      let sum = 0;
      for (const v of y) sum += v;
      return sum / y.length;
    } else {
      // Mode (majority vote) for classification
      const counts = {};
      let maxCount = -1;
      let majorityLabel = y[0];
      for (const label of y) {
        counts[label] = (counts[label] || 0) + 1;
        if (counts[label] > maxCount) {
          maxCount = counts[label];
          majorityLabel = label;
        }
      }
      return majorityLabel;
    }
  }

  _normalizeFeatureImportances() {
    let sum = 0;
    for (const f in this.featureImportances) {
      sum += this.featureImportances[f];
    }
    if (sum > 0) {
      for (const f in this.featureImportances) {
        this.featureImportances[f] /= sum;
      }
    }
  }

  predictRow(row) {
    let node = this.root;
    while (node && !node.isLeaf) {
      const val = row[node.feature];
      if (node.splitType === 'numeric') {
        if (Number(val) <= Number(node.threshold)) {
          node = node.left;
        } else {
          node = node.right;
        }
      } else {
        if (val === node.threshold) {
          node = node.left;
        } else {
          node = node.right;
        }
      }
    }
    return node ? node.value : null;
  }

  predict(X) {
    return X.map(row => this.predictRow(row));
  }

  // Exports a simplified JSON format of the tree for visual rendering
  toJSON() {
    const serializeNode = (node) => {
      if (!node) return null;
      if (node.isLeaf) {
        return {
          isLeaf: true,
          value: node.value,
          impurity: Number(node.impurity.toFixed(4)),
          samples: node.samples
        };
      }
      return {
        isLeaf: false,
        feature: node.feature,
        threshold: typeof node.threshold === 'number' ? Number(node.threshold.toFixed(4)) : node.threshold,
        splitType: node.splitType,
        samples: node.samples,
        impurity: Number(node.impurity.toFixed(4)),
        left: serializeNode(node.left),
        right: serializeNode(node.right)
      };
    };
    return serializeNode(this.root);
  }
}

// Specific wrappers
class DecisionTreeClassifier extends DecisionTree {
  constructor(config = {}) {
    super({ ...config, isRegression: false });
  }

  predictProbaRow(row) {
    let node = this.root;
    while (node && !node.isLeaf) {
      const val = row[node.feature];
      if (node.splitType === 'numeric') {
        if (Number(val) <= Number(node.threshold)) {
          node = node.left;
        } else {
          node = node.right;
        }
      } else {
        if (val === node.threshold) {
          node = node.left;
        } else {
          node = node.right;
        }
      }
    }
    // Return proportion of positive class (assuming binary targets: 0/1 or True/False)
    if (!node) return 0;
    return node.value === 1 || node.value === true ? 1.0 : 0.0;
  }

  predictProba(X) {
    return X.map(row => this.predictProbaRow(row));
  }
}

class DecisionTreeRegressor extends DecisionTree {
  constructor(config = {}) {
    super({ ...config, isRegression: true });
  }
}

// Random Forest Classifier
class RandomForestClassifier {
  constructor(config = {}) {
    this.nEstimators = config.nEstimators || 20;
    this.maxDepth = config.maxDepth || 6;
    this.minSamplesSplit = config.minSamplesSplit || 2;
    this.maxFeatures = config.maxFeatures || 'sqrt';
    this.trees = [];
    this.features = [];
    this.featureImportances = {};
  }

  fit(X, y, features = null) {
    this.trees = [];
    this.features = features || Object.keys(X[0]);
    this.featureImportances = {};
    for (const f of this.features) {
      this.featureImportances[f] = 0;
    }

    for (let i = 0; i < this.nEstimators; i++) {
      // Create bootstrap sample
      const { XSample, ySample } = MLMath.bootstrap(X, y);
      const tree = new DecisionTreeClassifier({
        maxDepth: this.maxDepth,
        minSamplesSplit: this.minSamplesSplit,
        maxFeatures: this.maxFeatures
      });
      tree.fit(XSample, ySample, this.features);
      this.trees.push(tree);

      // Accumulate feature importances
      for (const f of this.features) {
        this.featureImportances[f] += tree.featureImportances[f] || 0;
      }
    }

    // Average feature importances
    for (const f of this.features) {
      this.featureImportances[f] /= this.nEstimators;
    }
  }

  predictRow(row) {
    // Vote counts
    const votes = {};
    for (const tree of this.trees) {
      const pred = tree.predictRow(row);
      votes[pred] = (votes[pred] || 0) + 1;
    }
    // Return majority vote
    let maxCount = -1;
    let winner = null;
    for (const label in votes) {
      if (votes[label] > maxCount) {
        maxCount = votes[label];
        winner = label;
      }
    }
    // Parse back if it's numeric/boolean
    if (winner === 'true') return true;
    if (winner === 'false') return false;
    if (!isNaN(Number(winner)) && winner !== '') return Number(winner);
    return winner;
  }

  predict(X) {
    return X.map(row => this.predictRow(row));
  }

  predictProbaRow(row) {
    // Return average probability of positive class (1 / true)
    let posCount = 0;
    for (const tree of this.trees) {
      const pred = tree.predictRow(row);
      if (pred === 1 || pred === true || pred === 'true') {
        posCount++;
      }
    }
    return posCount / this.trees.length;
  }

  predictProba(X) {
    return X.map(row => this.predictProbaRow(row));
  }
}

// Random Forest Regressor
class RandomForestRegressor {
  constructor(config = {}) {
    this.nEstimators = config.nEstimators || 20;
    this.maxDepth = config.maxDepth || 6;
    this.minSamplesSplit = config.minSamplesSplit || 2;
    this.maxFeatures = config.maxFeatures || 0.33; // ~ M/3 for regression
    this.trees = [];
    this.features = [];
    this.featureImportances = {};
  }

  fit(X, y, features = null) {
    this.trees = [];
    this.features = features || Object.keys(X[0]);
    this.featureImportances = {};
    for (const f of this.features) {
      this.featureImportances[f] = 0;
    }

    for (let i = 0; i < this.nEstimators; i++) {
      const { XSample, ySample } = MLMath.bootstrap(X, y);
      const tree = new DecisionTreeRegressor({
        maxDepth: this.maxDepth,
        minSamplesSplit: this.minSamplesSplit,
        maxFeatures: this.maxFeatures
      });
      tree.fit(XSample, ySample, this.features);
      this.trees.push(tree);

      for (const f of this.features) {
        this.featureImportances[f] += tree.featureImportances[f] || 0;
      }
    }

    for (const f of this.features) {
      this.featureImportances[f] /= this.nEstimators;
    }
  }

  predictRow(row) {
    let sum = 0;
    for (const tree of this.trees) {
      sum += tree.predictRow(row);
    }
    return sum / this.trees.length;
  }

  predict(X) {
    return X.map(row => this.predictRow(row));
  }
}

// GBDT / XGBoost Binary Classifier
class GradientBoostingClassifier {
  constructor(config = {}) {
    this.nEstimators = config.nEstimators || 30;
    this.learningRate = config.learningRate || 0.1;
    this.maxDepth = config.maxDepth || 4;
    this.minSamplesSplit = config.minSamplesSplit || 2;
    this.regLambda = config.regLambda || 1.0; // L2 Regularization
    this.trees = [];
    this.basePred = 0; // F_0
    this.features = [];
    this.featureImportances = {};
  }

  fit(X, y, features = null, progressCallback = null) {
    this.trees = [];
    this.features = features || Object.keys(X[0]);
    this.featureImportances = {};
    for (const f of this.features) {
      this.featureImportances[f] = 0;
    }

    // Logit target mapping: binary 0 and 1
    const binaryY = y.map(val => (val === 1 || val === true || val === 'true' ? 1 : 0));
    const n = X.length;

    // F_0 base prediction: log-odds of target mean
    const sumY = binaryY.reduce((a, b) => a + b, 0);
    const meanY = sumY / n;
    this.basePred = MLMath.logit(meanY);

    // Initialize raw predictions F(x)
    const F = Array(n).fill(this.basePred);

    for (let m = 0; m < this.nEstimators; m++) {
      // Step 1: Compute probabilities and residuals
      const p = F.map(fVal => MLMath.sigmoid(fVal));
      const residuals = binaryY.map((yi, i) => yi - p[i]);

      // Step 2: Fit a Regression Tree to residuals
      const tree = new DecisionTreeRegressor({
        maxDepth: this.maxDepth,
        minSamplesSplit: this.minSamplesSplit,
        maxFeatures: null // evaluate all splits for boosting
      });
      tree.fit(X, residuals, this.features);

      // Step 3: Adjust leaf values with Newton-Raphson approximation
      this._adjustLeaves(tree.root, X, binaryY, F, p);

      this.trees.push(tree);

      // Accumulate predictions F(x) += learningRate * h_m(x)
      for (let i = 0; i < n; i++) {
        F[i] += this.learningRate * tree.predictRow(X[i]);
      }

      // Feature importances: accumulated from boosting trees
      for (const f of this.features) {
        this.featureImportances[f] += tree.featureImportances[f] || 0;
      }

      if (progressCallback) {
        // Calculate training loss (Log Loss)
        let totalLoss = 0;
        for (let i = 0; i < n; i++) {
          const pi = MLMath.sigmoid(F[i]);
          const yi = binaryY[i];
          totalLoss += -yi * Math.log(Math.max(1e-15, pi)) - (1 - yi) * Math.log(Math.max(1e-15, 1 - pi));
        }
        progressCallback(m + 1, totalLoss / n);
      }
    }

    // Average feature importances
    for (const f of this.features) {
      this.featureImportances[f] /= this.trees.length;
    }
  }

  // Adjust leaf nodes of GBDT classification tree recursively
  _adjustLeaves(node, X, y, F, p) {
    if (!node) return;

    if (node.isLeaf) {
      // Find samples that landed in this leaf
      // We do this by routing all X rows and matching the node reference.
      // Wait, a cleaner way: traverse indices through splits to match exactly.
      // Let's run a check:
      node.value = this._calculateLeafNR(node, X, y, F, p);
      return;
    }

    this._adjustLeaves(node.left, X, y, F, p);
    this._adjustLeaves(node.right, X, y, F, p);
  }

  // Calculate Newton-Raphson leaf value for a given node subset
  _calculateLeafNR(leafNode, X, y, F, p) {
    // Route samples to find which indices land on this specific leaf
    const indicesInLeaf = [];
    for (let i = 0; i < X.length; i++) {
      if (this._isRowInLeaf(X[i], leafNode)) {
        indicesInLeaf.push(i);
      }
    }

    if (indicesInLeaf.length === 0) return 0;

    let num = 0;
    let denom = 0;
    for (const i of indicesInLeaf) {
      const residual = y[i] - p[i];
      num += residual;
      denom += p[i] * (1 - p[i]);
    }

    // L2 regularization: denom += regLambda
    denom += this.regLambda;

    return denom === 0 ? 0 : num / denom;
  }

  _isRowInLeaf(row, targetLeaf) {
    let node = this.root_tree_test || this.trees[this.trees.length - 1]?.root; // Wait, we can route it down the tree!
    // Since we are adjusting leaves of the tree we just built, let's route the row down that tree:
    if (!node) return false;
    let curr = node;
    while (curr && !curr.isLeaf) {
      const val = row[curr.feature];
      if (curr.splitType === 'numeric') {
        if (Number(val) <= Number(curr.threshold)) {
          curr = curr.left;
        } else {
          curr = curr.right;
        }
      } else {
        if (val === curr.threshold) {
          curr = curr.left;
        } else {
          curr = curr.right;
        }
      }
    }
    return curr === targetLeaf;
  }

  predictProbaRow(row) {
    let logOdds = this.basePred;
    for (const tree of this.trees) {
      logOdds += this.learningRate * tree.predictRow(row);
    }
    return MLMath.sigmoid(logOdds);
  }

  predictProba(X) {
    return X.map(row => this.predictProbaRow(row));
  }

  predictRow(row) {
    const proba = this.predictProbaRow(row);
    return proba >= 0.5 ? 1 : 0;
  }

  predict(X) {
    return X.map(row => this.predictRow(row));
  }
}

// GBDT Regressor
class GradientBoostingRegressor {
  constructor(config = {}) {
    this.nEstimators = config.nEstimators || 30;
    this.learningRate = config.learningRate || 0.1;
    this.maxDepth = config.maxDepth || 4;
    this.minSamplesSplit = config.minSamplesSplit || 2;
    this.trees = [];
    this.basePred = 0;
    this.features = [];
    this.featureImportances = {};
  }

  fit(X, y, features = null, progressCallback = null) {
    this.trees = [];
    this.features = features || Object.keys(X[0]);
    this.featureImportances = {};
    for (const f of this.features) {
      this.featureImportances[f] = 0;
    }

    const n = X.length;

    // F_0 base prediction: mean of target values
    let sumY = 0;
    for (const val of y) sumY += val;
    this.basePred = sumY / n;

    // Initialize raw predictions F(x)
    const F = Array(n).fill(this.basePred);

    for (let m = 0; m < this.nEstimators; m++) {
      // Step 1: Compute residuals (yi - F(xi))
      const residuals = y.map((yi, i) => yi - F[i]);

      // Step 2: Fit a Regression Tree to residuals
      const tree = new DecisionTreeRegressor({
        maxDepth: this.maxDepth,
        minSamplesSplit: this.minSamplesSplit,
        maxFeatures: null
      });
      tree.fit(X, residuals, this.features);

      this.trees.push(tree);

      // Accumulate predictions F(x) += learningRate * h_m(x)
      for (let i = 0; i < n; i++) {
        F[i] += this.learningRate * tree.predictRow(X[i]);
      }

      // Feature importances
      for (const f of this.features) {
        this.featureImportances[f] += tree.featureImportances[f] || 0;
      }

      if (progressCallback) {
        // Calculate MSE loss
        let totalLoss = 0;
        for (let i = 0; i < n; i++) {
          const err = y[i] - F[i];
          totalLoss += err * err;
        }
        progressCallback(m + 1, totalLoss / n);
      }
    }

    // Average feature importances
    for (const f of this.features) {
      this.featureImportances[f] /= this.trees.length;
    }
  }

  predictRow(row) {
    let pred = this.basePred;
    for (const tree of this.trees) {
      pred += this.learningRate * tree.predictRow(row);
    }
    return pred;
  }

  predict(X) {
    return X.map(row => this.predictRow(row));
  }
}

// Expose models globally for script.js
window.AutoML = {
  DecisionTreeClassifier,
  DecisionTreeRegressor,
  RandomForestClassifier,
  RandomForestRegressor,
  GradientBoostingClassifier,
  GradientBoostingRegressor,
  MathUtils: MLMath
};
