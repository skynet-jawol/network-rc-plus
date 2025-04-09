const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

class ModelLoader {
  constructor() {
    this.models = new Map();
  }

  async loadModel(modelPath, config) {
    try {
      const modelJson = path.join(modelPath, 'model.json');
      const weightsBin = path.join(modelPath, 'weights.bin');
      
      if (!fs.existsSync(modelJson) || !fs.existsSync(weightsBin)) {
        throw new Error('模型文件不完整');
      }

      const model = await tf.loadLayersModel(`file://${modelJson}`);
      this.models.set(config.modelId, {
        instance: model,
        metadata: {
          inputShape: config.inputShape,
          labels: config.labels
        }
      });

      return {
        status: 'success',
        modelId: config.modelId,
        apiEndpoint: `/inference/${config.modelId}`
      };
    } catch (err) {
      console.error(`模型加载失败: ${err.message}`);
      throw new Error('模型部署失败');
    }
  }

  getModel(modelId) {
    return this.models.get(modelId);
  }
}

module.exports = new ModelLoader();