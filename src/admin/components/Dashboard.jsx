import React from 'react';
import { Box, H2, H4, Text } from '@adminjs/design-system';

const Dashboard = (props) => {
  const { totalUsers, totalListings, totalOffers, pendingVerifications, activeListings } = props;

  return (
    <Box>
      <H2>Dashboard</H2>
      <Box flex flexDirection="row" flexWrap="wrap" mt="xl">
        <StatBox 
          title="Total Users" 
          value={totalUsers}
          color="primary60"
        />
        <StatBox 
          title="Active Listings" 
          value={activeListings}
          color="success"
        />
        <StatBox 
          title="Pending Verifications" 
          value={pendingVerifications}
          color="warning"
        />
        <StatBox 
          title="Total Offers" 
          value={totalOffers}
          color="info"
        />
      </Box>
    </Box>
  );
};

const StatBox = ({ title, value, color }) => (
  <Box
    flex
    flexDirection="column"
    variant="white"
    m="md"
    p="xl"
    width={1/4}
    boxShadow="card"
  >
    <H4 mb="md">{title}</H4>
    <Text fontSize="xl" color={color}>{value}</Text>
  </Box>
);

export default Dashboard; 