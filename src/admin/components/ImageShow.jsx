import React from 'react';
import { Box } from '@adminjs/design-system';

const ImageShow = (props) => {
  const { record } = props;
  const srcUrl = record.params.url;

  return (
    <Box>
      {srcUrl && <img src={srcUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px' }} />}
    </Box>
  );
};

export default ImageShow; 