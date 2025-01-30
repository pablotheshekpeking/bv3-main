import { ComponentLoader } from 'adminjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentLoader = new ComponentLoader();

const Components = {
  Dashboard: componentLoader.add('Dashboard', './Dashboard'),
  ImageShow: componentLoader.add('ImageShow', './ImageShow'),
  ImagesList: componentLoader.add('ImagesList', './ImagesList'),
  ImagesShow: componentLoader.add('ImagesShow', './ImagesShow'),
  ImagesEdit: componentLoader.add('ImagesEdit', './ImagesEdit'),
  DocumentShow: componentLoader.add('DocumentShow', './DocumentShow')
};

// Watch components in development
if (process.env.NODE_ENV === 'development') {
  componentLoader.watch();
}

export { componentLoader, Components }; 