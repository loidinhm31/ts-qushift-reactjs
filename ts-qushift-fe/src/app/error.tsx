"use client";

import { Box, Button, Center, Link, Text } from "@chakra-ui/react";
import { FiAlertTriangle } from "react-icons/fi";

import { EmptyState } from "@/components/EmptyState";

export default function Error() {
  return (
    <>
      <Center flexDirection="column" gap="4" fontSize="lg" className="subpixel-antialiased">
        <EmptyState text="Sorry, the page you are looking for does not exist." icon={FiAlertTriangle} />
        <Box display="flex" flexDirection="column" alignItems="center" gap="2" mt="6">
          <Text fontSize="sm">If you were trying to contribute data but ended up here, please file a bug.</Text>
          <Button
            width="fit-content"
            leftIcon={<FiAlertTriangle className="text-blue-500" aria-hidden="true" />}
            variant="solid"
            size="xs"
          >
            <Link
              key="Report a Bug"
              href="#"
              aria-label="Report a Bug"
              className="flex items-center"
              _hover={{ textDecoration: "none" }}
              isExternal
            >
              Report a Bug
            </Link>
          </Button>
        </Box>
      </Center>
    </>
  );
}