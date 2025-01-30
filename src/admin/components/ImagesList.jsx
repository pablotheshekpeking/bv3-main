import React from 'react';
import { Box } from '@adminjs/design-system';

const ImagesList = (props) => {
  const { record } = props;
  const images = record.params.images || [];

  return (
    <Box>
      {images.map((image, index) => (
        <img 
          key={index} 
          src={image.url} 
          alt={`Preview ${index}`} 
          style={{ 
            width: '50px', 
            height: '50px', 
            objectFit: 'cover', 
            marginRight: '5px' 
          }} 
        />
      ))}
    </Box>
  );
};

export default ImagesList; 