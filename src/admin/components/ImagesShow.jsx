import React from 'react';
import { Box, Label } from '@adminjs/design-system';

const ImagesShow = (props) => {
  const { record } = props;
  const images = record.params.images || [];

  return (
    <Box>
      <Label>Images</Label>
      <Box flex flexDirection="row" flexWrap="wrap">
        {images.map((image, index) => (
          <Box key={index} mr="default" mb="default">
            <img 
              src={image.url} 
              alt={`Preview ${index}`} 
              style={{ 
                maxWidth: '200px', 
                maxHeight: '200px',
                objectFit: 'cover' 
              }} 
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ImagesShow; 